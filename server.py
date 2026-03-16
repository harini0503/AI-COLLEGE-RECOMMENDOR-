from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
from google import genai
import os
import json
import re
from dotenv import load_dotenv

# Load environment variables from .env file (if it exists)
load_dotenv()

app = Flask(__name__)
CORS(app)

# =====================================================
# PASTE YOUR GEMINI API KEY BELOW (or use a .env file)
# =====================================================
# The code will first check for a GEMINI_API_KEY environment variable.
# If not found, it will use the hardcoded string below:
HARDCODED_API_KEY = "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", HARDCODED_API_KEY)
# =====================================================

client = None


def get_client():
    global client
    if client is None:
        client = genai.Client(api_key=GEMINI_API_KEY)
    return client


# --- Serve Frontend ---
@app.route("/")
def serve_index():
    return render_template("index.html")

@app.route("/favicon.ico")
@app.route("/logo.ico")
def favicon():
    return send_from_directory("static", "logo.ico", mimetype='image/vnd.microsoft.icon')


# --- API Status Check ---
@app.route("/api-status")
def api_status():
    if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("AIzaSyXXX"):
        return jsonify({"connected": False, "error": "API key not set in server.py"})
    try:
        c = get_client()
        c.models.generate_content(model="gemini-2.5-flash", contents="Say OK")
        return jsonify({"connected": True})
    except Exception as e:
        return jsonify({"connected": False, "error": str(e)})


# --- Cutoff Calculation Endpoint ---
@app.route("/calculate-cutoff", methods=["POST"])
def calculate_cutoff():
    data = request.json
    stream = data.get("stream", "Engineering")
    maths = float(data.get("maths", 0))
    physics = float(data.get("physics", 0))
    chemistry = float(data.get("chemistry", 0))
    biology = float(data.get("biology", 0))

    # Tamil Nadu cutoff formula (each subject out of 200, max cutoff = 200)
    if stream == "Engineering":
        cutoff = (maths / 2) + (physics / 4) + (chemistry / 4)
    else:
        cutoff = (biology / 2) + (physics / 4) + (chemistry / 4)

    max_cutoff = 200.0
    percentage = round((cutoff / max_cutoff) * 100, 2)

    if cutoff >= 195:
        tier, tier_color = "Excellent", "#10b981"
        message = "Outstanding score! You qualify for top-tier institutions."
    elif cutoff >= 185:
        tier, tier_color = "Very Good", "#3b82f6"
        message = "Great score! Many prestigious colleges are within reach."
    elif cutoff >= 170:
        tier, tier_color = "Good", "#8b5cf6"
        message = "Solid score. You have good options across many colleges."
    elif cutoff >= 150:
        tier, tier_color = "Above Average", "#f59e0b"
        message = "Decent score. Several colleges match your cutoff range."
    elif cutoff >= 120:
        tier, tier_color = "Average", "#f97316"
        message = "You can explore colleges in your cutoff range."
    else:
        tier, tier_color = "Below Average", "#ef4444"
        message = "Consider improving your scores or exploring alternative paths."

    return jsonify({
        "cutoff": round(cutoff, 2),
        "maxCutoff": max_cutoff,
        "percentage": percentage,
        "tier": tier,
        "tierColor": tier_color,
        "message": message,
        "stream": stream,
    })


# --- Gemini AI College Suggestion Endpoint ---
@app.route("/suggest-colleges", methods=["POST"])
def suggest_colleges():
    c = get_client()
    if not c:
        return jsonify({"success": False, "error": "Gemini API key not configured in server.py"}), 400

    data = request.json
    cutoff = data.get("cutoff", 0)
    district = data.get("district", "")
    stream = data.get("stream", "Engineering")
    interest = data.get("interest", "")
    student_name = data.get("name", "Student")

    prompt = f"""You are an expert education counselor for Tamil Nadu, India. A student needs college suggestions.

Student Details:
- Name: {student_name}
- Cutoff Score: {cutoff}/200
- Preferred District: {district}
- Stream: {stream}
- Interest Area: {interest}

Based on the cutoff score and preferences, suggest 5-8 real colleges in Tamil Nadu that the student can apply to. For each college provide:
1. College name (real, existing college)
2. Location/City
3. Course/Department recommended
4. Approximate annual fees
5. Placement percentage or placement details
6. Hostel availability
7. A brief reason why this college suits the student
8. College ranking or rating (out of 5 stars)

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation outside the JSON. Format:
[
  {{
    "name": "College Name",
    "location": "City, District",
    "course": "Recommended Course",
    "fees": "Rs.XX,XXX/year",
    "placement": "XX% placement rate",
    "hostel": "Available/Not Available",
    "reason": "Brief reason why this college is suitable",
    "rating": 4.2
  }}
]

Focus on colleges near or in {district} district first, but also include top colleges from other districts that match the cutoff. Be realistic about which colleges the student can get into based on their cutoff of {cutoff}/200."""

    try:
        response = c.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        text = response.text.strip()

        # Remove markdown code fences if present
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text)
        text = text.strip()

        colleges = json.loads(text)
        return jsonify({"success": True, "colleges": colleges})
    except json.JSONDecodeError:
        return jsonify({
            "success": True,
            "colleges": [],
            "rawText": response.text if response else "No response from AI"
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# --- Run Server ---
if __name__ == "__main__":
    if GEMINI_API_KEY.startswith("AIzaSyXXX"):
        print("[WARNING] You need to set your real Gemini API key in server.py (line 14)")
        print("          Replace the placeholder with your actual key.")
    else:
        print("[OK] Gemini API key is configured.")

    print("")
    print("FutureTrack Server starting...")
    print("Open http://localhost:5000 in your browser")
    print("")
    app.run(debug=True, port=5000)
