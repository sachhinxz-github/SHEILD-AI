# 🛡️ SHIELD_AI - AI-Powered Phishing Detection

A Chrome browser extension with a Python Flask backend that uses machine learning to detect phishing websites in real-time.

## Features

- **Real-time URL Analysis**: Automatically analyzes URLs for phishing indicators
- **Machine Learning Detection**: Uses Random Forest classifier trained on phishing URL patterns
- **Visual Warnings**: Full-page overlay warning when phishing is detected
- **Popup Dashboard**: Beautiful UI showing analysis results with confidence scores
- **Caching System**: Reduces API calls by caching recent analysis results
- **Risk Level Assessment**: Categorizes threats as high/medium/low/safe

## Project Structure

```
SHIELD_AI/
├── backend/
│   ├── app.py              # Flask API server
│   ├── train.py            # Model training script
│   ├── features.py         # URL feature extraction
│   ├── requirements.txt    # Python dependencies
│   ├── web-page-phishing.csv  # Training dataset
│   └── phishing_model.pkl  # Trained model (generated after training)
└── extension/
    ├── manifest.json       # Chrome extension config
    ├── popup.html          # Popup UI
    ├── popup.js           # Popup logic
    ├── background.js      # Background service worker
    ├── content.js         # Content script for warnings
    └── icons/             # Extension icons
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Train the ML Model

```bash
python train.py
```

This will:
- Load the phishing dataset
- Train a Random Forest classifier
- Save the model as `phishing_model.pkl`
- Display accuracy metrics

### 3. Start the Backend Server

```bash
python app.py
```

The API will be available at `http://localhost:5000`

**API Endpoints:**
- `GET /health` - Health check
- `POST /predict` - Analyze single URL
- `POST /batch-predict` - Analyze multiple URLs

### 4. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. The SHIELD_AI icon should appear in your toolbar

## Usage

### Automatic Protection
Once installed, the extension automatically:
- Monitors the current URL
- Analyzes it for phishing indicators
- Shows a warning overlay if phishing is detected

### Manual Analysis
Click the SHIELD_AI icon in your toolbar to:
- View the current URL analysis
- See confidence scores and risk levels
- Check API connection status

### Settings
The extension supports:
- **Auto-analyze**: Automatically analyze pages on load
- **Notifications**: Show desktop notifications for threats
- **Caching**: Cache results to reduce API calls
- **Custom API URL**: Configure your own backend endpoint

## How It Works

### Feature Extraction
The system analyzes URLs based on these characteristics:
- URL length
- Number of dots, hyphens, slashes, question marks
- Special characters (@, =, &, !, _)
- And more...

### Machine Learning Model
- **Algorithm**: Random Forest Classifier
- **Training Data**: 11,000+ labeled URLs
- **Features**: 10 URL characteristics
- **Accuracy**: ~96% on test data

### Risk Assessment
- **High Risk** (≥70% phishing probability): Full-page warning
- **Medium Risk** (40-69%): Warning in popup
- **Low Risk** (20-39%): Minor caution
- **Safe** (<20%): No warning

## Testing

Test the API directly:

```bash
# Health check
curl http://localhost:5000/health

# Single URL prediction
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Batch prediction
curl -X POST http://localhost:5000/batch-predict \
  -H "Content-Type: application/json" \
  -d '{"urls": ["https://example.com", "https://suspicious-site.xyz"]}'
```

## Troubleshooting

### Backend Issues
- **Port already in use**: Change port in `app.py` or kill the process on port 5000
- **Model not found**: Run `python train.py` to generate the model
- **Import errors**: Ensure all dependencies are installed

### Extension Issues
- **Extension not loading**: Make sure Developer mode is enabled
- **Cannot connect to API**: Ensure backend server is running on port 5000
- **Icons missing**: Run `python generate_icons.py` to create icon files

## Technology Stack

- **Backend**: Python, Flask, scikit-learn, pandas
- **Frontend**: JavaScript (Chrome Extension Manifest V3)
- **ML Model**: Random Forest Classifier
- **UI**: Custom CSS with gradient design

## License

MIT License - Feel free to use and modify for your projects.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for a safer internet**