from flask import Flask, render_template, request, jsonify, send_from_directory
from PIL import Image
import torch
import torch.nn as nn
import torchvision.models as models
from torchvision import transforms
import io
import os

app = Flask(__name__)

# ======================================
# تحميل النموذج
# ======================================
model = models.resnet50(weights=None)  # بدون تحميل من الإنترنت
model.fc = nn.Linear(2048, 14)
device = 'cuda' if torch.cuda.is_available() else 'cpu'
model = model.to(device)
model.load_state_dict(torch.load(
    'models/resnet50_model.pth',
    map_location=device
))
model.eval()

print(f"✅ النموذج محمل بنجاح على {device}")

# ======================================
# التحقق من مجلد الصور
# ======================================
path = 'static/examples'
if os.path.exists(path):
    files = os.listdir(path)
    print(f"✅ المجلد موجود")
    print(f"الملفات: {files}")
else:
    print("❌ المجلد غير موجود")

# ======================================
# إعدادات
# ======================================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

sign_names = {
    0: 'Speed Limit',   1: 'Goods Vehicles',
    2: 'No Overtaking', 3: 'No Stopping',
    4: 'No Parking',    5: 'Stop',
    6: 'Bicycle',       7: 'Hump',
    8: 'No Left',       9: 'No Right',
    10: 'Priority To',  11: 'No Entry',
    12: 'Yield',        13: 'Parking'
}

performance_data = {
    'ChallengeFree': 99.99,
    'Darkening-1': 99.86,
    'Darkening-3': 99.62,
    'Darkening-5': 88.57,
    'Haze-1': 100.00,
    'Haze-3': 99.95,
    'Haze-5': 97.17,
    'Rain-1': 99.89,
    'Rain-3': 99.66,
    'Rain-5': 98.80,
    'Snow-1': 99.97,
    'Snow-3': 99.53,
    'Snow-5': 98.42
}

weather_info = {
    'Normal':    {'emoji': '☀️',  'description': 'صور نظيفة بدون تأثير', 'color': '#2ecc71'},
    'Darkening': {'emoji': '🌑',  'description': 'إظلام وإضاءة ليلية',   'color': '#e74c3c'},
    'Haze':      {'emoji': '🌫️', 'description': 'ضباب كثيف',            'color': '#95a5a6'},
    'Rain':      {'emoji': '🌧️', 'description': 'أمطار',                'color': '#3498db'},
    'Snow':      {'emoji': '❄️',  'description': 'ثلج',                  'color': '#9b59b6'}
}

# ======================================
# Routes
# ======================================
@app.route('/')
def index():
    return render_template('index.html',
                           performance=performance_data,
                           weather_info=weather_info,
                           signs=sign_names)

@app.route('/static/examples/<filename>')
def example_image(filename):
    return send_from_directory('static/examples', filename)

@app.route('/api/project-info')
def project_info():
    return jsonify({
        'title': 'Traffic Sign Recognition Under Adverse Weather',
        'model': 'ResNet-50',
        'accuracy': '99%',
        'dataset': 'CURE-TSR',
        'total_images': 94974,
        'weather_conditions': 13,
        'sign_classes': 14,
        'device': device
    })

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file'}), 400

    try:
        img = Image.open(io.BytesIO(file.read())).convert('RGB')
        tensor = transform(img).unsqueeze(0).to(device)

        with torch.no_grad():
            output = model(tensor)
            probs = torch.softmax(output, dim=1)
            conf, pred = probs.max(1)

        pred_idx = pred.item()
        confidence = conf.item() * 100
        pred_name = sign_names[pred_idx]

        probs_dict = {
            sign_names[i]: float(probs[0, i].item())
            for i in range(len(sign_names))
        }

        if confidence >= 95:
            confidence_level = 'عالي جداً ✅'
        elif confidence >= 85:
            confidence_level = 'عالي ✅'
        elif confidence >= 70:
            confidence_level = 'متوسط ⚠️'
        else:
            confidence_level = 'منخفض ❌'

        return jsonify({
            'prediction': pred_name,
            'confidence': round(confidence, 2),
            'confidence_level': confidence_level,
            'probabilities': probs_dict,
            'success': True
        })

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/examples')
def get_examples():
    examples = [
        {'name': 'Normal',    'path': '/static/examples/normal_speed_limit.png'},
        {'name': 'Rain',      'path': '/static/examples/rain_speed_limit.png'},
        {'name': 'Haze',      'path': '/static/examples/haze_speed_limit.png'},
        {'name': 'Snow',      'path': '/static/examples/snow_parking.png'},
        {'name': 'Darkening', 'path': '/static/examples/dark_speed_limit.png'},
    ]
    return jsonify(examples)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
