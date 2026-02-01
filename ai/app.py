from flask import Flask, request, jsonify
import numpy as np
from stable_baselines3 import PPO
import joblib
import os

app = Flask(__name__)
PORT = 5000

print(f"🧠 Hybrid AI Service starting on Port {PORT}...")

# LOAD BOTH MODELS
try:
    if not os.path.exists("ppo_hybrid_agent.zip") or not os.path.exists("iso_forest.joblib"):
        raise FileNotFoundError("Models not found! Run 'python train_rl.py' first.")
        
    rl_model = PPO.load("ppo_hybrid_agent")
    iso_model = joblib.load("iso_forest.joblib")
    print("✅ Loaded: PPO Agent + Isolation Forest")
except Exception as e:
    print(f"❌ Error: {str(e)}")
    exit(1)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        
        # 1. PREPROCESS (Normalize 0-1)
        # Using simplified scaling for hackathon demo
        req_scaled = min(data['requests'] / 8000, 1.0)
        err_scaled = min(data['errorRate'], 1.0)
        lat_scaled = min(data['latency'] / 1000, 1.0)
        
        # 2. FEATURE EXTRACTION (Isolation Forest)
        # "Hey Forest, does this look weird?"
        features = np.array([[req_scaled, err_scaled, lat_scaled]])
        anomaly_score = iso_model.predict(features)[0] # -1 (Bad) or 1 (Good)
        
        # 3. DECISION MAKING (RL Agent)
        # "Okay, given the raw data AND the Forest's opinion, what do I do?"
        # Input Vector: [Requests, Error, Latency, AnomalyScore]
        obs = np.array([req_scaled, err_scaled, lat_scaled, anomaly_score])
        action, _ = rl_model.predict(obs)
        
        # 4. RESPONSE
        action_code = int(action)
        result = {'threatLevel': 'low', 'status': 'active', 'action': 'Monitor'}

        if action_code == 2:
            result = {'threatLevel': 'high', 'status': 'critical', 'action': 'IP Blocked'}
        elif action_code == 1:
            result = {'threatLevel': 'medium', 'status': 'warning', 'action': 'Rate Limit'}
            
        # Log for demo visibility
        forest_msg = "Anomaly!" if anomaly_score == -1 else "Normal"
        print(f"🔮 Input: {data['requests']} reqs | Forest: {forest_msg} | RL Action: {result['action']}", flush=True)
            
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=PORT, debug=False)