document.addEventListener('DOMContentLoaded', () => {
    // ⚠️ استبدل هذا الرابط بعنوان URL لتطبيق الويب الذي نشرته من Apps Script
    // هذا الرابط هو الذي يحتاج إلى تحديث بعد نشر الكود الجديد
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxaXMe62Vdv3cd_rR7bsc9jOEsyw7C23p33_LY7S9J6hXLnHFOc8SkMQ7D5K3QahyPw/exec'; 

    // عناصر التسجيل
    const student1Input = document.getElementById('student1Name');
    const student2Input = document.getElementById('student2Name');
    // إضافة المتغير الجديد لعنصر اختيار الدوام (Shift)
    const shiftSelect = document.getElementById('shift'); 
    const projectNameInput = document.getElementById('projectName'); 
    const addButton = document.getElementById('addProjectBtn');
    const messageElement = document.getElementById('message');

    // عناصر عرض المشاريع
    const viewButton = document.getElementById('viewProjectsBtn');
    const searchInput = document.getElementById('searchInput');
    const listContainer = document.getElementById('projectsListContainer');

    /**
     * @description إرسال البيانات إلى Google Apps Script
     */
    async function sendDataToGoogleSheet() {
        const student1 = student1Input.value.trim();
        const student2 = student2Input.value.trim();
        // جلب قيمة الدوام
        const shift = shiftSelect.value;
        const projectName = projectNameInput.value.trim(); 

        // 2. التحقق من أن جميع الحقول المطلوبة ليست فارغة (تم تحديثه)
        if (student1 === '' || student2 === '' || projectName === '' || shift === '') {
            showMessage('الرجاء تعبئة جميع الحقول الإلزامية.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('student1', student1);
        formData.append('student2', student2); 
        // إضافة حقل الدوام إلى البيانات المرسلة
        formData.append('shift', shift); 
        formData.append('projectName', projectName); 

        addButton.disabled = true;
        showMessage('... يتم الإرسال إلى السجل المركزي، يرجى الانتظار', 'loading');

        try {
            const response = await fetch(WEB_APP_URL, { method: 'POST', body: formData });
            
            // تحقق من استجابة ناجحة (OK) قبل محاولة التحويل إلى JSON
            if (!response.ok) {
                // إذا كان الخادم قد رد بخطأ 500 أو غيره
                 throw new Error(`خطأ في استجابة الخادم: ${response.statusText}`);
            }
            
            const result = await response.json();

            if (result.status === 'success') {
                showMessage(result.message, 'success'); 
                student1Input.value = '';
                student2Input.value = '';
                // تفريغ حقل الدوام بعد التسجيل
                shiftSelect.value = '';
                projectNameInput.value = '';
                student1Input.focus();
                // تحديث القائمة تلقائيًا بعد التسجيل الناجح
                fetchProjects(); 
            } else {
                // إذا كان الـ status هو 'error' (وهذا هو المسار الذي سيسلكه خطأ getRange المصحح)
                throw new Error(result.message || "فشل في تسجيل البيانات.");
            }
        } catch (error) {
            // سيتم عرض رسالة الخطأ المصححة من الخادم هنا
            showMessage(`فشل في التسجيل: ${error.message}`, 'error');
        } finally {
            addButton.disabled = false;
        }
    }

    /**
     * @description جلب وعرض المشاريع المسجلة
     */
    async function fetchProjects() {
        listContainer.innerHTML = '<p class="placeholder">جاري تحميل البيانات...</p>';
        try {
            const response = await fetch(WEB_APP_URL);
            
            if (!response.ok) {
                throw new Error(`خطأ في استجابة الخادم: ${response.statusText}`);
            }
            
            const result = await response.json();

            if (result.status === 'success' && result.data) {
                displayProjects(result.data);
            } else {
                throw new Error(result.message || 'فشل في جلب البيانات.');
            }
        } catch (error) {
            listContainer.innerHTML = `<p class="placeholder" style="color:var(--error-color);">${error.message}</p>`;
        }
    }

    /**
     * @description بناء وعرض جدول المشاريع
     */
    function displayProjects(projects) {
        if (projects.length === 0) {
            listContainer.innerHTML = '<p class="placeholder">لا توجد مشاريع مسجلة حتى الآن.</p>';
            return;
        }

        const table = document.createElement('table');
        table.id = 'projectsTable';
        
        // إنشاء رأس الجدول
        const thead = table.createTHead();
        const headerRow = thead.insertRow();
        // تم تحديث رؤوس الجدول
        const headers = ['اسم الطالب الأول', 'اسم الطالب الثاني', 'الدوام', 'اسم المشروع']; 
        headers.forEach(text => {
            const th = document.createElement('th');
            th.textContent = text;
            headerRow.appendChild(th);
        });

        // إنشاء جسم الجدول
        const tbody = table.createTBody();
        projects.forEach(project => {
            const row = tbody.insertRow();
            row.insertCell().textContent = project.student1 || '';
            row.insertCell().textContent = project.student2 || '';
            // عرض قيمة الدوام
            row.insertCell().textContent = project.shift || '';
            row.insertCell().textContent = project.projectName || '';
        });

        listContainer.innerHTML = '';
        listContainer.appendChild(table);
    }
    
    /**
     * @description البحث في الجدول
     */
    function searchTable() {
        const filter = searchInput.value.toLowerCase();
        const table = document.getElementById('projectsTable');
        if (!table) return;
        const rows = table.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) { // ابدأ من 1 لتجاهل رأس الجدول
            const cells = rows[i].getElementsByTagName('td');
            let found = false;
            for (let j = 0; j < cells.length; j++) {
                // البحث يشمل جميع الأعمدة
                if (cells[j].textContent.toLowerCase().indexOf(filter) > -1) { 
                    found = true;
                    break;
                }
            }
            rows[i].style.display = found ? '' : 'none';
        }
    }

    /**
     * @description عرض الرسائل للمستخدم
     */
    function showMessage(msg, type) {
        messageElement.textContent = msg;
        messageElement.style.color = 'white';
        if (type === 'success') {
            messageElement.style.backgroundColor = 'var(--success-color)';
        } else if (type === 'error') {
            messageElement.style.backgroundColor = 'var(--error-color)';
        } else { // loading
            messageElement.style.backgroundColor = '#f0ad4e';
        }
    }

    // ربط الأحداث
    addButton.addEventListener('click', sendDataToGoogleSheet);
    viewButton.addEventListener('click', fetchProjects);
    searchInput.addEventListener('keyup', searchTable);
});