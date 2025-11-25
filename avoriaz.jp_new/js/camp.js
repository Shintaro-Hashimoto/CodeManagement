document.addEventListener('DOMContentLoaded', function() {
    // 1. 設備スライドショー (ドット切り替え)
    const slides = document.querySelectorAll('.facility-slide');
    const dots = document.querySelectorAll('.dot');
    
    if (slides.length > 0 && dots.length > 0) {
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                // 全て非アクティブにする
                slides.forEach(s => {
                    s.classList.remove('active');
                    s.style.display = 'none'; // 念のためdisplayも操作
                });
                dots.forEach(d => d.classList.remove('active'));
                
                // 該当のスライドとドットをアクティブにする
                if (slides[index]) {
                    slides[index].classList.add('active');
                    slides[index].style.display = 'block';
                }
                dot.classList.add('active');
            });
        });
    }

    // 2. 規約アコーディオン
    const accHeaders = document.querySelectorAll('.accordion-header');
    accHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            if (content) {
                if (content.style.display === "block") {
                    content.style.display = "none";
                    content.classList.remove('open');
                } else {
                    content.style.display = "block";
                    content.classList.add('open');
                }
            }
        });
    });

    // 3. 追従予約ボタン
    const floatBtn = document.getElementById('floatingReserve');
    if (floatBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 500) { // 500pxスクロールしたら表示
                floatBtn.classList.add('visible');
            } else {
                floatBtn.classList.remove('visible');
            }
        });
    }
});