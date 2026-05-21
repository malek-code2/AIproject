// ننتظر تحميل الصفحة كاملاً
document.addEventListener('DOMContentLoaded', function() {

    // ======================================
    // Tabs
    // ======================================
   // ======================================
// Tabs
// ======================================
function switchTab(event, tabName) {
    // إخفاء كل التبويبات
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
        c.style.display = 'none';
    });

    // إزالة التحديد من كل الأزرار
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
    });

    // إظهار التبويب المختار
    const selectedTab = document.getElementById(tabName);
    selectedTab.classList.add('active');
    selectedTab.style.display = 'block';

    // تحديد الزر المختار
    event.target.classList.add('active');
}
window.switchTab = switchTab;


    // ======================================
    // Upload
    // ======================================
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const imagePreview = document.getElementById('imagePreview');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    const error = document.getElementById('error');

    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            handleFile();
        }
    });

    fileInput.addEventListener('change', handleFile);

    function handleFile() {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            uploadBtn.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    uploadBtn.addEventListener('click', predict);

    // ======================================
    // Predict من رفع الصورة
    // ======================================
    async function predict() {
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        loading.style.display = 'block';
        result.style.display = 'none';
        error.classList.remove('show');

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (response.ok && data.success) {
                displayResult(data);
            } else {
                showError(data.error || 'حدث خطأ');
            }
        } catch (err) {
            showError(err.message);
        } finally {
            loading.style.display = 'none';
        }
    }

    // ======================================
    // Load Example
    // ======================================
    async function loadExample(event, filename, weatherName) {
        // إزالة التحديد السابق
        document.querySelectorAll('.example-item').forEach(
            item => item.classList.remove('selected')
        );
        event.currentTarget.classList.add('selected');

        // عرض الصورة
        imagePreview.src = `/static/examples/${filename}`;
        imagePreview.style.display = 'block';
        uploadBtn.disabled = false;

        // تحديث نص منطقة الرفع
        const uploadText = document.querySelector('.upload-area p:last-of-type');
        if (uploadText) uploadText.textContent = `تم اختيار: ${weatherName}`;

        loading.style.display = 'block';
        result.style.display = 'none';
        error.classList.remove('show');

        try {
            const response = await fetch(`/static/examples/${filename}`);
            const blob = await response.blob();
            const formData = new FormData();
            formData.append('file', blob, filename);

            const predictResponse = await fetch('/predict', {
                method: 'POST',
                body: formData
            });
            const data = await predictResponse.json();

            if (predictResponse.ok && data.success) {
                displayResult(data);
            } else {
                showError(data.error || 'حدث خطأ');
            }
        } catch (err) {
            showError(err.message);
        } finally {
            loading.style.display = 'none';
        }
    }
    window.loadExample = loadExample;

    // ======================================
    // Display Result
    // ======================================
    function displayResult(data) {
        document.getElementById('predictionName').textContent = data.prediction;
        document.getElementById('confidence').textContent = `الثقة: ${data.confidence}%`;

        let confidenceClass = 'confidence-high';
        if (data.confidence < 85) confidenceClass = 'confidence-low';
        else if (data.confidence < 95) confidenceClass = 'confidence-medium';

        document.getElementById('confidenceLevel').innerHTML =
            `<span class="${confidenceClass}">${data.confidence_level}</span>`;

        const probList = document.getElementById('probabilityList');
        probList.innerHTML = '';

        const sorted = Object.entries(data.probabilities).sort(([,a],[,b]) => b - a);

        sorted.forEach(([name, prob]) => {
            const percentage = (prob * 100).toFixed(1);
            probList.innerHTML += `
                <div class="prob-item">
                    <span>${name}</span>
                    <div class="prob-bar">
                        <div class="prob-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="prob-value">${percentage}%</div>
                </div>`;
        });

        result.classList.add('show');
        result.style.display = 'block';
    }

    // ======================================
    // Show Error
    // ======================================
    function showError(msg) {
        error.textContent = msg;
        error.classList.add('show');
    }

}); // نهاية DOMContentLoaded