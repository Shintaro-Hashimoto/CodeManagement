<?php
/**
 * The template for displaying the footer
 */
?>

<footer class="site-footer">
    <div class="footer-container">
        <div class="footer-info">
            <h3>ロッジ アボリア & 空庭</h3>
            <p>〒386-2211 長野県須坂市仁礼峰の原高原 3153-166</p>
            
            <div class="footer-links">
                <a href="<?php echo home_url('/cancelpolicy'); ?>">キャンセルポリシー</a>
                <a href="<?php echo home_url('/contact'); ?>">お問い合わせ</a>
                <a href="<?php echo home_url('/news'); ?>">お知らせ</a>
            </div>

            <div class="footer-sns">
                <a href="https://www.instagram.com/avoriaz_jp/" target="_blank" rel="noopener noreferrer" class="sns-link instagram">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    Instagram
                </a>
                
                <a href="https://x.com/soraniwacamp" target="_blank" rel="noopener noreferrer" class="sns-link x-twitter">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    X (Twitter)
                </a>
            </div>

        </div>
        <div class="footer-copyright">
            &copy; <?php echo date('Y'); ?> Lodge Avoriaz. All Rights Reserved.
        </div>
    </div>
</footer>

<div id="policyModal" class="policy-modal-overlay">
    <div class="policy-modal-content">
        <div class="policy-modal-header">
            <h3 class="policy-modal-title">キャンセルポリシー</h3>
            <button id="closePolicyModal" class="policy-modal-close">&times;</button>
        </div>
        <div class="policy-modal-body">
            <div class="policy-block">
                <h2>ロッジ「宿泊」 キャンセル規定</h2>
                <table class="policy-table">
                    <tr><th>7日前 〜 2日前</th><td>宿泊料金の 30%</td></tr>
                    <tr><th>前日</th><td>宿泊料金の 50%</td></tr>
                    <tr><th>当日・無連絡</th><td>宿泊料金の 100%</td></tr>
                </table>
            </div>

            <div class="policy-block">
                <h2>キャンプ場「空庭」 キャンセル規定</h2>
                <p style="margin-bottom: 20px;">ご予約完了時点からキャンセル料が発生いたします。日程変更の場合は、1回に限りキャンセル料不要で承ります。</p>
                <table class="policy-table">
                    <tr><th>予約完了 〜 11日前</th><td>ご利用料金の 10%</td></tr>
                    <tr><th>10日前 〜 2日前</th><td>ご利用料金の 50%</td></tr>
                    <tr><th>前日・当日・無連絡</th><td>ご利用料金の 100%</td></tr>
                </table>
                <h3>キャンセル料免除について</h3>
                <p>以下の状況が見込まれる場合、キャンセル料は免除となります。</p>
                <ul class="policy-list">
                    <li>須坂市仁礼町地方に大雨・洪水・暴風・土砂災害警報が出た場合</li>
                    <li>台風等の災害予報により、キャンプ場近辺や主要高速道路の通行止めが見込まれる場合</li>
                    <li>キャンプ場都合によるクローズとなる場合</li>
                </ul>
                <p style="font-size:0.9rem; color:#666; margin-top:10px;">
                    ※免除対象となる場合は、ご利用前日の15時までに判断し、順次ご連絡いたします。
                </p>
            </div>

            <div class="policy-block">
                <h2>お問い合わせ・変更</h2>
                <p>ご予約のキャンセル・変更は、お電話またはお問い合わせフォームよりご連絡ください。</p>
                <p style="margin-top: 20px;">
                    <strong>ロッジ アボリア</strong><br>
                    TEL: 0268-74-2704<br>
                    <a href="<?php echo home_url('/contact'); ?>" style="text-decoration: underline; color: #0073aa;">お問い合わせフォームはこちら</a>
                </p>
            </div>
        </div>
    </div>
</div>

<?php wp_footer(); ?>
</body>
</html>