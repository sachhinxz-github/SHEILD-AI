"""
SHIELD_AI - Model Training Script
Trains a Random Forest classifier to detect phishing URLs
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import os

def train_model():
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Load the data
    data_path = os.path.join(script_dir, 'web-page-phishing.csv')
    print(f"📂 Loading data from: {data_path}")
    
    if not os.path.exists(data_path):
        print(f"❌ Error: Data file not found at {data_path}")
        print("   Make sure web-page-phishing.csv is in the same directory as train.py")
        return False
    
    data = pd.read_csv(data_path)
    print(f"✅ Data loaded: {len(data)} rows, {len(data.columns)} columns")
    print(f"   Columns: {list(data.columns)}")
    
    # 2. Select features - Match actual column names in the dataset
    feature_columns = [
        'url_length', 'n_dots', 'n_hypens', 'n_underline', 
        'n_slash', 'n_questionmark', 'n_equal', 'n_at', 'n_and', 'n_exclamation'
    ]
    
    print(f"\n🔍 Checking feature columns...")
    missing_cols = [col for col in feature_columns if col not in data.columns]
    if missing_cols:
        print(f"❌ Error: Missing columns: {missing_cols}")
        print(f"   Available columns: {list(data.columns)}")
        return False
    
    X = data[feature_columns]
    y = data['phishing']
    
    print(f"✅ Features selected: {feature_columns}")
    print(f"   Target distribution:")
    print(f"   - Safe (0): {(y == 0).sum()}")
    print(f"   - Phishing (1): {(y == 1).sum()}")
    
    # 3. Split the data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"\n📊 Data split:")
    print(f"   Training set: {len(X_train)} samples")
    print(f"   Test set: {len(X_test)} samples")
    
    # 4. Train the model
    print(f"\n🤖 Training Random Forest classifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1  # Use all CPU cores
    )
    model.fit(X_train, y_train)
    print(f"✅ Model trained successfully")
    
    # 5. Evaluate the model
    print(f"\n📈 Evaluating model performance...")
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
    print(f"   Cross-validation accuracy: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Test set evaluation
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"   Test accuracy: {accuracy:.4f}")
    
    print(f"\n📋 Classification Report:")
    print(f"   {classification_report(y_test, y_pred, target_names=['Safe', 'Phishing'])}")
    
    print(f"📊 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"   [[TN, FP],")
    print(f"    [FN, TP]]")
    print(f"   {cm}")
    
    # Feature importance
    print(f"\n🎯 Feature Importance:")
    feature_importance = sorted(
        zip(feature_columns, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True
    )
    for feature, importance in feature_importance:
        bar = "█" * int(importance * 50)
        print(f"   {feature:15s}: {importance:.4f} {bar}")
    
    # 6. Save the model
    model_path = os.path.join(script_dir, 'phishing_model.pkl')
    joblib.dump(model, model_path)
    print(f"\n💾 Model saved to: {model_path}")
    print(f"   File size: {os.path.getsize(model_path) / 1024:.1f} KB")
    
    # 7. Save feature columns for reference
    features_path = os.path.join(script_dir, 'feature_columns.json')
    import json
    with open(features_path, 'w') as f:
        json.dump({
            'features': feature_columns,
            'target': 'phishing',
            'model_version': '1.0.0',
            'training_samples': len(X_train),
            'test_samples': len(X_test),
            'accuracy': float(accuracy)
        }, f, indent=2)
    print(f"📝 Feature metadata saved to: {features_path}")
    
    print(f"\n✅ Training complete! Model is ready for deployment.")
    return True

if __name__ == '__main__':
    success = train_model()
    if not success:
        exit(1)