import gymnasium as gym
from gymnasium import spaces
import numpy as np
from stable_baselines3 import PPO
from sklearn.ensemble import IsolationForest
import joblib
import os

# --- 1. TRAIN ISOLATION FOREST (The Anomaly Detector) ---
print("🌲 Training Isolation Forest on 'Normal' baseline traffic...")

# Generate dummy "Normal" data (Low traffic, Low errors)
# [Requests (0-1), ErrorRate (0-1), Latency (0-1)]
X_normal = np.random.normal(loc=[0.1, 0.0, 0.1], scale=[0.05, 0.01, 0.05], size=(1000, 3))
X_normal = np.clip(X_normal, 0, 1) # Keep within bounds

# Fit the model
iso_forest = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
iso_forest.fit(X_normal)

# Save it
joblib.dump(iso_forest, "iso_forest.joblib")
print("✅ Isolation Forest saved.")

# --- 2. THE RL ENVIRONMENT (The Decision Maker) ---
class CyberDefenseEnv(gym.Env):
    def __init__(self):
        super(CyberDefenseEnv, self).__init__()
        
        # OBSERVATION: [Requests, Error, Latency, ISOLATION_FOREST_SCORE]
        # We added a 4th input: The anomaly score (-1 for anomaly, 1 for normal)
        self.observation_space = spaces.Box(low=-1, high=1, shape=(4,), dtype=np.float32)
        
        # ACTIONS: 0=Monitor, 1=RateLimit, 2=BLOCK
        self.action_space = spaces.Discrete(3)
        
        self.state = np.array([0.1, 0.0, 0.1, 1.0], dtype=np.float32) # Start normal
        self.attack_active = False

    def step(self, action):
        # 1. Simulate Traffic Changes
        traffic, error, latency, _ = self.state
        
        # If we BLOCK during attack, traffic drops
        if self.attack_active and action == 2:
            traffic *= 0.1
            error *= 0.1
            
        # Random Event Generator
        if np.random.rand() > 0.95: # Attack Starts
            self.attack_active = True
            traffic = np.random.uniform(0.8, 1.0) # High traffic
            error = np.random.uniform(0.2, 0.8)   # High error
        elif np.random.rand() > 0.8: # Attack Ends
            self.attack_active = False
            traffic = np.random.uniform(0.05, 0.2)
            error = 0.0

        # 2. ASK ISOLATION FOREST: "Is this weird?"
        # Reshape for sklearn
        current_metrics = np.array([[traffic, error, latency]])
        # Returns -1 (Anomaly) or 1 (Normal)
        anomaly_score = iso_forest.predict(current_metrics)[0]
        
        # Update State
        self.state = np.array([traffic, error, latency, anomaly_score], dtype=np.float32)
        
        # 3. REWARD LOGIC
        reward = 0
        
        if self.attack_active:
            if action == 2: reward += 20 # Huge reward for blocking attack
            elif action == 0: reward -= 20 # Huge penalty for ignoring attack
        else:
            if action == 2: reward -= 10 # Penalty for false positive
            elif action == 0: reward += 5 # Reward for staying calm
            
        # Bonus: If Isolation Forest says "Anomaly" (-1) and RL says "Block", give extra points
        if anomaly_score == -1 and action == 2:
            reward += 5

        return self.state, reward, False, False, {}

    def reset(self, seed=None, options=None):
        self.state = np.array([0.1, 0.0, 0.1, 1.0], dtype=np.float32)
        self.attack_active = False
        return self.state, {}

# --- 3. TRAIN RL AGENT ---
if __name__ == "__main__":
    print("🤖 Training Hybrid RL Agent (PPO + Isolation Forest)...")
    env = CyberDefenseEnv()
    model = PPO("MlpPolicy", env, verbose=1)
    model.learn(total_timesteps=15000) # Fast training
    model.save("ppo_hybrid_agent")
    print("💾 Hybrid Brain Saved: 'ppo_hybrid_agent.zip'")