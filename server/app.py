import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from openai import OpenAI
import fitz  # PyMuPDF (PDF 읽기)
import docx  # Word 파일 읽기

# 환경 변수 로드
load_dotenv()

app = Flask(__name__)
CORS(app)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
SERPAPI_KEY = os.getenv("SERPAPI_KEY")

# -------------------------------
# 1) 내부 문서 불러오기
# -------------------------------
def load_docs():
    texts = []

    # PDF 파일 읽기
    for file in os.listdir("."):
        if file.endswith(".pdf"):
            doc = fitz.open(file)
            for page in doc:
                texts.append(page.get_text())
    
    # Word 파일 읽기
    for file in os.listdir("."):
        if file.endswith(".docx"):
            doc = docx.Document(file)
            for para in doc.paragraphs:
                texts.append(para.text)

    return "\n".join(texts)

LOCAL_DOCS = load_docs()

# -------------------------------
# 2) 웹 검색 함수
# -------------------------------
def search_web(query: str) -> str:
    if not SERPAPI_KEY:
        return "⚠️ SerpAPI 키가 설정되지 않았습니다."

    url = "https://serpapi.com/search"
    params = {"q": query, "hl": "ko", "gl": "kr", "api_key": SERPAPI_KEY}
    res = requests.get(url, params=params)

    if res.status_code != 200:
        return f"⚠️ 웹 검색 오류: {res.text}"

    data = res.json()
    results = []
    for item in data.get("organic_results", [])[:5]:
        title = item.get("title", "")
        snippet = item.get("snippet", "")
        link = item.get("link", "")
        results.append(f"- {title}\n{snippet}\n{link}")

    return "\n".join(results) if results else "검색 결과가 없습니다."

# -------------------------------
# 3) 메인 챗 엔드포인트
# -------------------------------
@app.post("/api/chat")
def chat():
    data = request.get_json(force=True)
    user_msg = (data.get("message") or "").strip()
    use_web = data.get("useWeb", False)

    if not user_msg:
        return jsonify({"reply": "메시지가 비었어요."}), 400

    # 내부 문서 기반 답변
    context = LOCAL_DOCS
    reply_parts = []

    if context:
        reply_parts.append(f"📄 내부 자료 요약:\n{context[:1500]}")

    # 웹 검색 필요 시 실행
    if use_web:
        web_results = search_web(user_msg)
        reply_parts.append(f"🌐 웹 검색 결과:\n{web_results}")

    # OpenAI 모델에 전달할 전체 프롬프트
    system_prompt = """당신은 자립준비청소년 지원 전문가입니다.
    먼저 제공된 내부 문서에서 정보를 우선 활용하고,
    필요시 웹 검색 결과를 참고하여 최신 정보를 보완하세요.
    답변은 친절하고 구체적으로 작성하세요."""

    final_prompt = "\n\n".join(reply_parts) + f"\n\n사용자 질문: {user_msg}"

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": final_prompt}
            ],
            max_tokens=800,  # ✅ 토큰 조금 넉넉히
            temperature=0.6
        )
        answer = resp.choices[0].message.content
        return jsonify({"reply": answer})
    except Exception as e:
        return jsonify({"reply": f"⚠️ 오류 발생: {str(e)}"}), 500

# -------------------------------
# 4) 실행
# -------------------------------
if __name__ == "__main__":
    app.run(port=3000, debug=True)
