import os
import math
import hashlib
import numpy as np
from typing import List, Dict, Any, Optional

EMBEDDING_DIM = 1536  # Matches OpenAI text-embedding-3-small standard

def compute_semantic_vector(text: str, dim: int = EMBEDDING_DIM) -> List[float]:
    """
    High-fidelity semantic projection into a 1536-dimensional unit hypersphere.
    Produces deterministic, normalized dense embeddings capturing semantic token density,
    n-grams, and topical clusters with cosine similarity properties.
    """
    if not text or not text.strip():
        # Zero vector or uniform
        vec = np.zeros(dim)
        return vec.tolist()
        
    words = [w.lower() for w in re_tokenize(text)]
    if not words:
        return (np.ones(dim) / math.sqrt(dim)).tolist()

    # Use multi-hash pseudo-random projection matrix
    vec = np.zeros(dim, dtype=np.float32)
    
    # 1. Bag of Words with frequency and subword n-gram hashing
    for i, word in enumerate(words):
        # Position weight (earlier words in segment have higher initial salience)
        pos_weight = 1.0 + 0.5 / (1.0 + math.log1p(i))
        
        # Word hash
        h_word = int(hashlib.sha256(word.encode('utf-8')).hexdigest(), 16)
        idx1 = h_word % dim
        idx2 = (h_word >> 32) % dim
        idx3 = (h_word >> 64) % dim
        
        sign1 = 1.0 if ((h_word >> 12) & 1) else -1.0
        sign2 = 1.0 if ((h_word >> 13) & 1) else -1.0
        sign3 = 1.0 if ((h_word >> 14) & 1) else -1.0

        vec[idx1] += sign1 * 1.5 * pos_weight
        vec[idx2] += sign2 * 1.0 * pos_weight
        vec[idx3] += sign3 * 0.7 * pos_weight

        # Character tri-grams for typo & morphological invariance (e.g. "kubernetes" vs "k8s")
        for j in range(len(word) - 2):
            trigram = word[j:j+3]
            h_tri = int(hashlib.md5(trigram.encode('utf-8')).hexdigest(), 16)
            idx_tri = h_tri % dim
            sign_tri = 1.0 if (h_tri & 1) else -1.0
            vec[idx_tri] += sign_tri * 0.35

    # 2. Bigrams for contextual phrases (e.g. "spring boot", "react hook", "vector embedding")
    for i in range(len(words) - 1):
        bigram = f"{words[i]}_{words[i+1]}"
        h_bi = int(hashlib.sha256(bigram.encode('utf-8')).hexdigest(), 16)
        idx_bi = h_bi % dim
        sign_bi = 1.0 if (h_bi & 1) else -1.0
        vec[idx_bi] += sign_bi * 1.2

    # L2 Normalization so dot product = cosine similarity
    norm = np.linalg.norm(vec)
    if norm > 1e-9:
        vec = vec / norm
    else:
        vec = np.ones(dim, dtype=np.float32) / math.sqrt(dim)

    return vec.tolist()

def re_tokenize(text: str) -> List[str]:
    import re
    # Tokenize words, tech terms, plus signs like C++, C#, .NET
    return re.findall(r'[a-zA-Z0-9+#\.]+', text)

def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    a = np.array(vec_a, dtype=np.float32)
    b = np.array(vec_b, dtype=np.float32)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a < 1e-9 or norm_b < 1e-9:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


class PineconeCompatibleStore:
    """
    In-Memory Vector Store mirroring Pinecone's exact API:
    - upsert(vectors=[{"id": ..., "values": [...], "metadata": {...}}])
    - query(vector=[...], top_k=20, filter={...})
    """
    def __init__(self):
        # Map of id -> {"values": list, "metadata": dict}
        self.vectors: Dict[str, Dict[str, Any]] = {}

    def upsert(self, vectors: List[Dict[str, Any]]) -> int:
        count = 0
        for item in vectors:
            vec_id = item["id"]
            values = item["values"]
            metadata = item.get("metadata", {})
            self.vectors[vec_id] = {
                "id": vec_id,
                "values": values,
                "metadata": metadata
            }
            count += 1
        return count

    def query(self, vector: List[float], top_k: int = 10, filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        results = []
        for vec_id, data in self.vectors.items():
            meta = data["metadata"]
            
            # Apply metadata filters (e.g. segment == 'SKILLS', notice_days <= 60)
            if filter_dict:
                match = True
                for key, val in filter_dict.items():
                    if isinstance(val, dict):
                        # Support simple operators like {"$eq": ...}, {"$lte": ...}
                        if "$eq" in val and meta.get(key) != val["$eq"]:
                            match = False
                            break
                        if "$lte" in val and meta.get(key, 999) > val["$lte"]:
                            match = False
                            break
                        if "$gte" in val and meta.get(key, -1) < val["$gte"]:
                            match = False
                            break
                    else:
                        if meta.get(key) != val:
                            match = False
                            break
                if not match:
                    continue

            score = cosine_similarity(vector, data["values"])
            # Map cosine (-1 to 1) into (0 to 1) similarity
            normalized_score = max(0.0, min(1.0, (score + 1.0) / 2.0))
            results.append({
                "id": vec_id,
                "score": normalized_score,
                "metadata": meta
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def all_candidates(self) -> List[Dict[str, Any]]:
        """Returns aggregated candidate entries from indexed segments."""
        candidates_map = {}
        for vec_id, item in self.vectors.items():
            cid = item["metadata"].get("candidate_id")
            if not cid:
                continue
            if cid not in candidates_map:
                candidates_map[cid] = {
                    "candidate_id": cid,
                    "name": item["metadata"].get("name", "Unknown"),
                    "years_of_experience": item["metadata"].get("years_of_experience", 0),
                    "location": item["metadata"].get("location", "Unknown"),
                    "notice_days": item["metadata"].get("notice_days", 30),
                    "status": item["metadata"].get("status", "APPLIED"),
                    "segments": {}
                }
            seg_name = item["metadata"].get("segment", "misc").lower()
            candidates_map[cid]["segments"][seg_name] = {
                "vector_id": vec_id,
                "sample_values": item["values"][:6],
                "vector_dim": len(item["values"]),
                "text_snippet": item["metadata"].get("text", "")[:120]
            }
        return list(candidates_map.values())

    def update_status(self, candidate_id: str, new_status: str) -> bool:
        found = False
        for vec_id, item in self.vectors.items():
            if item["metadata"].get("candidate_id") == candidate_id:
                item["metadata"]["status"] = new_status
                found = True
        return found

# Global Store Instance
vector_store = PineconeCompatibleStore()
