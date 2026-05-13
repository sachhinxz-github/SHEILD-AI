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
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    data_path = os.path.join(script_dir, 'web-page-phishing.csv')
    
    if not os.path.exists(data_path):
        print(f"Error: Data file not found at {data_path}")
        return False
    
    data = pd.read_csv(data_path)
    
    feature_columns = [
        'url_length', 'n_dots', 'n_hypens', 'n_underline', 
        'n_slash', 'n_questionmark', 'n_equal', 'n_at', 'n_and', 'n_exclamation'
    ]
    
    missing_cols = [col for col in feature_columns if col not in data.columns]
    if missing_cols:
        print(f"Error: Missing columns: {missing_cols}")
        return False
    
    X = data[feature_columns]
    y = data['phishing']
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
    print(f"Cross-validation accuracy: {cv_scores.mean():.4f}")
    
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Test accuracy: {accuracy:.4f}")
    
    print(classification_report(y_test, y_pred, target_names=['Safe', 'Phishing']))
    
    feature_importance = sorted(
        zip(feature_columns, model.feature_importances_),
        key=lambda x: x[1],
        reverse=True
    )
    for feature, importance in feature_importance:
        print(f"{feature}: {importance:.4f}")
    
    model_path = os.path.join(script_dir, 'phishing_model.pkl')
    joblib.dump(model, model_path)
    print(f"Model saved to: {model_path}")
    
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
    
    print("Training complete!")
    return True

if __name__ == '__main__':
    success = train_model()
    if not success:
        exit(1)