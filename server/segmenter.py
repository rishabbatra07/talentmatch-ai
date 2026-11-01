import re
from typing import Dict, Any, List

def extract_metadata(text: str) -> Dict[str, Any]:
    lines = [l.strip() for l in text.strip().split("\n") if l.strip()]
    name = lines[0] if lines else "Candidate"
    
    # Email regex
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else "candidate@example.com"
    
    # Phone regex
    phone_match = re.search(r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
    phone = phone_match.group(0) if phone_match else "+91 98765 43210"
    
    # Years of experience estimation
    exp_matches = re.findall(r'(\d+)\+?\s*(?:years?|yrs?)(?:\s*of)?\s*(?:experience|exp)?', text, re.IGNORECASE)
    years_of_experience = int(exp_matches[0]) if exp_matches else 4
    if years_of_experience > 30:
        years_of_experience = 5

    # Notice period estimation
    notice_match = re.search(r'(\d+)\s*(?:days?|months?)\s*notice', text, re.IGNORECASE)
    notice_days = 30
    if notice_match:
        val = int(notice_match.group(1))
        notice_days = val * 30 if "month" in notice_match.group(0).lower() else val

    # Location
    locations = ["Bangalore", "Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi", "Noida", "Gurugram", "San Francisco", "Remote", "New York"]
    found_loc = "Bengaluru, India"
    for loc in locations:
        if re.search(rf'\b{loc}\b', text, re.IGNORECASE):
            found_loc = loc
            break

    return {
        "name": name,
        "email": email,
        "phone": phone,
        "years_of_experience": years_of_experience,
        "location": found_loc,
        "notice_days": notice_days
    }

def segment_resume(text: str) -> Dict[str, Any]:
    """
    Splits resume into distinct semantic segments:
    1. summary
    2. skills
    3. experience
    4. education
    5. projects
    """
    clean_text = text.replace("\r\n", "\n")
    
    # Section header patterns
    sections = {
        "summary": "",
        "skills": "",
        "experience": "",
        "education": "",
        "projects": ""
    }
    
    section_patterns = {
        "skills": r'(?:^|\n)\s*(?:technical\s+)?skills?(?:\s*&?\s*competencies)?\s*[:\n]',
        "experience": r'(?:^|\n)\s*(?:work\s+)?experience|employment\s+history|professional\s+background\s*[:\n]',
        "projects": r'(?:^|\n)\s*(?:key\s+)?projects?(?:\s*&?\s*case\s*studies)?\s*[:\n]',
        "education": r'(?:^|\n)\s*education(?:al\s+background)?|academic\s+credentials|qualifications?\s*[:\n]',
        "summary": r'(?:^|\n)\s*(?:professional\s+)?summary|profile|about\s+me\s*[:\n]'
    }

    # Find split positions
    matches = []
    for sec_name, pattern in section_patterns.items():
        for m in re.finditer(pattern, clean_text, re.IGNORECASE):
            matches.append((m.start(), m.end(), sec_name))
            
    matches.sort(key=lambda x: x[0])
    
    if not matches:
        # Fallback segmentation by paragraphs
        parts = clean_text.split("\n\n")
        sections["summary"] = parts[0] if len(parts) > 0 else clean_text
        sections["skills"] = parts[1] if len(parts) > 1 else ""
        sections["experience"] = "\n\n".join(parts[2:]) if len(parts) > 2 else ""
    else:
        # Preamble before first header is summary/contact
        if matches[0][0] > 0:
            sections["summary"] = clean_text[:matches[0][0]].strip()
            
        for i in range(len(matches)):
            start_content = matches[i][1]
            end_content = matches[i+1][0] if i + 1 < len(matches) else len(clean_text)
            sec_name = matches[i][2]
            content = clean_text[start_content:end_content].strip()
            if sections[sec_name]:
                sections[sec_name] += "\n\n" + content
            else:
                sections[sec_name] = content

    # Clean up empty sections
    if not sections["skills"]:
        # Fallback extraction of common tech keywords
        tech_words = ["python", "fastapi", "react", "java", "spring boot", "postgresql", "docker", "aws", "kubernetes", "pinecone", "redis", "typescript", "git"]
        found = [w for w in tech_words if re.search(rf'\b{w}\b', clean_text, re.IGNORECASE)]
        sections["skills"] = ", ".join(found) if found else "Full Stack Software Development, API Design, System Architecture"

    if not sections["experience"]:
        sections["experience"] = clean_text[:800]

    metadata = extract_metadata(clean_text)

    return {
        "metadata": metadata,
        "segments": {
            "summary": sections["summary"],
            "skills": sections["skills"],
            "experience": sections["experience"],
            "education": sections["education"] or "Bachelor of Technology in Computer Science",
            "projects": sections["projects"]
        }
    }

def segment_job_description(text: str) -> Dict[str, str]:
    """
    Segments Job Description into Required Skills, Responsibilities, and Criteria.
    """
    clean_text = text.replace("\r\n", "\n")
    
    req_skills = ""
    responsibilities = ""
    
    skills_match = re.search(r'(?:requirements|qualifications|required\s+skills|what\s+you\s+need|tech\s+stack)[\s\S]*?(?=(?:responsibilities|what\s+you\'ll\s+do|about\s+the\s+role|$))', clean_text, re.IGNORECASE)
    if skills_match:
        req_skills = skills_match.group(0).strip()
        
    resp_match = re.search(r'(?:responsibilities|what\s+you\'ll\s+do|key\s+duties|the\s+role)[\s\S]*?(?=(?:requirements|qualifications|about\s+the\s+company|$))', clean_text, re.IGNORECASE)
    if resp_match:
        responsibilities = resp_match.group(0).strip()
        
    if not req_skills:
        req_skills = clean_text
    if not responsibilities:
        responsibilities = clean_text

    return {
        "required_skills": req_skills,
        "responsibilities": responsibilities
    }
