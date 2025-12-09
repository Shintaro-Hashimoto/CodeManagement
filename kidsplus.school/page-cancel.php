<?php
/**
 * Template Name: キャンセル専用ページ
 * @package bau
 */
defined( 'ABSPATH' ) || exit;

// ★★★ GASの新しいウェブアプリURL ★★★
define('GAS_API_URL', 'https://script.google.com/macros/s/AKfycbxW9U2GYz7I540pGMIH9-nUZCGe56bO7NWOD7s6rj7ZHQPu5fFlIFP7xEvxOyZiM1CI/exec');

// パラメータ取得
$mode           = isset($_GET['mode']) ? $_GET['mode'] : 'single'; 
$reservation_id = isset($_GET['id']) ? sanitize_text_field($_GET['id']) : '';
$fid            = isset($_GET['fid']) ? sanitize_text_field($_GET['fid']) : '';
$ym             = isset($_GET['ym']) ? sanitize_text_field($_GET['ym']) : '';

// 変数初期化
$view_data   = null;
$message     = '';
$status      = 'init';
$error_type  = '';

// -----------------------------------------------------------
// 1. POST送信時の処理
// -----------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($mode === 'single' && !empty($_POST['reservation_id'])) {
        $post_fields = ['action' => 'cancel_single', 'id' => $_POST['reservation_id']];
    } elseif ($mode === 'monthly' && isset($_POST['cancel_ids'])) {
        $ids_str = is_array($_POST['cancel_ids']) ? implode(',', $_POST['cancel_ids']) : '';
        $post_fields = ['action' => 'cancel_monthly', 'ids' => $ids_str];
    } elseif ($mode === 'monthly' && !isset($_POST['cancel_ids'])) {
        $post_fields = ['action' => 'cancel_monthly', 'ids' => ''];
    }

    if (isset($post_fields)) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, GAS_API_URL);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_fields));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        $response = curl_exec($ch);
        curl_close($ch);
        
        $result = json_decode($response, true);
        if ($result && isset($result['success']) && $result['success']) {
            $status = 'success';
            $message = ($mode === 'monthly') ? 'スケジュールの確認・調整が完了しました。' : '予約のキャンセルが完了しました。';
        } else {
            $status = 'error';
            $message = isset($result['message']) ? $result['message'] : '処理に失敗しました。';
        }
    }
}

// -----------------------------------------------------------
// 2. GET時の処理
// -----------------------------------------------------------
if ($status === 'init') {
    $query_params = [];
    if ($mode === 'monthly' && $fid && $ym) {
        $query_params = ['action' => 'get_monthly', 'fid' => $fid, 'ym' => $ym];
    } elseif ($mode === 'single' && $reservation_id) {
        $query_params = ['action' => 'get_single', 'id' => $reservation_id];
    }

    if (!empty($query_params)) {
        $url = GAS_API_URL . '?' . http_build_query($query_params);
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        $response = curl_exec($ch);
        curl_close($ch);

        $result = json_decode($response, true);
        if ($result && isset($result['success']) && $result['success']) {
            $view_data = $result['data'];
        } else {
            $status = 'error';
            $error_type = isset($result['errorType']) ? $result['errorType'] : 'UNKNOWN';
            $message = isset($result['message']) ? $result['message'] : 'データの取得に失敗しました。';
            $deadline_display = isset($result['deadlineDisplay']) ? $result['deadlineDisplay'] : '';
        }
    } elseif ($status !== 'success') {
        $status = 'error';
        $message = 'パラメータが不足しています。URLをご確認ください。';
    }
}

get_header(); 
?>

<main class="pages">
  <article>
    <section class="subheader">
      <div class="page-header cancel-img" style="background-color: #fff; padding-bottom: 0;">
        <div class="container">
          <div class="row">
            <div class="col-md-10">
              <h1 class="page-title" style="color: #333; margin-bottom: 15px; font-size: 2.8rem; font-weight: 800;">
                  <?php echo ($mode === 'monthly') ? '翌月のスケジュール確認' : 'ご予約のキャンセル'; ?>
              </h1>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="container">
      <div class="row justify-content-center">
        <div class="col-12 col-md-10">
          <div class="page-contents py-4">

            <?php if ($status === 'success'): ?>
                <div class="text-center p-4 p-md-5 bg-white rounded shadow-sm">
                    <h2 class="text-success mb-4" style="font-size: 2.5rem;"><i class="ri-checkbox-circle-line"></i> 完了</h2>
                    <p class="mb-5 fw-bold fs-3"><?php echo esc_html($message); ?></p>
                    
                    <div class="text-center mt-5">
                        <a href="<?php echo esc_url( home_url('/') ); ?>" class="btn-cancel-custom pastel-blue shadow">
                            トップページへ
                        </a>
                    </div>
                </div>

            <?php elseif ($status === 'error'): ?>
                <div class="text-center p-4 p-md-5 bg-white rounded shadow-sm">
                    <h2 class="text-danger mb-4" style="font-size: 2.5rem;"><i class="ri-error-warning-line"></i> お受け付けできません</h2>
                    
                    <p class="mb-3 fw-bold fs-4"><?php echo esc_html($message); ?></p>

                    <?php if ($error_type === 'TOO_LATE'): ?>
                        <p class="mb-3 text-secondary fs-5">レッスン当日、または日時を過ぎているため、<br>Webからのキャンセルはできません。</p>
                    <?php elseif ($error_type === 'DEADLINE_PASSED'): ?>
                        <p class="mb-3 text-secondary fs-5">
                            確認期限（<?php echo esc_html($deadline_display); ?>）を過ぎているため、<br>Webからの変更はできません。
                        </p>
                    <?php endif; ?>

                    <div class="mt-4 p-4 bg-light rounded text-center d-inline-block w-100">
                        <p class="mb-2 fw-bold text-dark fs-5">【カスタマーサポート】</p>
                        <p class="mb-0 fs-5">
                        メール: <a href="mailto:support@kidsplus.me" class="fw-bold">support@kidsplus.me</a><br>
                        電話: <a href="tel:05031851570" class="fw-bold">050-3185-1570</a>
                        </p>
                    </div>
                </div>

            <?php elseif ($view_data): ?>

                <?php if ($mode === 'single'): ?>
                    <div class="confirmation-box bg-white p-4 p-md-5">
                        <h3 class="text-center mb-5 f-blue fw-bold" style="font-size: 2.6rem; color: #0056b3;">
                            以下の予約をキャンセルしますか？
                        </h3>
                        
                        <div class="reservation-detail mb-5 px-md-3">
                            <div class="row mb-4 align-items-center">
                                <div class="col-md-3 text-secondary fw-bold fs-4">施設名</div>
                                <div class="col-md-9 fw-bold text-dark" style="font-size: 2.0rem;">
                                    <?php echo esc_html($view_data['facilityName']); ?>
                                </div>
                            </div>
                            <div class="row mb-4 align-items-center">
                                <div class="col-md-3 text-secondary fw-bold fs-4">日時</div>
                                <div class="col-md-9 fw-bold text-dark" style="font-size: 2.0rem;">
                                    <?php echo esc_html($view_data['dateDisplay']); ?>
                                    <span class="ms-3"><?php echo esc_html($view_data['timeDisplay']); ?></span>
                                </div>
                            </div>
                        </div>

                        <form method="post" action="">
                            <input type="hidden" name="reservation_id" value="<?php echo esc_attr($view_data['id']); ?>">
                            
                            <div class="text-center mt-4">
                                <p class="text-danger mb-3 fw-bold fs-5">※この操作は取り消せません。</p>
                                <button type="submit" class="btn-cancel-custom pastel-red shadow">
                                    キャンセルを確定する
                                </button>
                            </div>
                        </form>
                    </div>

                <?php elseif ($mode === 'monthly'): ?>
                    <div class="monthly-box bg-white p-3 p-md-4">
                        <h3 class="text-center mb-3 f-blue fw-bold" style="font-size: 2.6rem; color: #0056b3;">
                            翌月のスケジュール確認
                        </h3>
                        <p class="text-center mb-5 text-secondary fw-bold" style="font-size: 1.8rem; line-height: 1.4;">
                            <?php echo esc_html($view_data['facilityName']); ?> 様<br>
                            <span style="font-size: 1.4rem;">対象月: <?php echo esc_html($view_data['targetMonth']); ?></span>
                        </p>

                        <form method="post" action="" id="monthlyForm">
                            <div class="list-group mb-4 shadow-sm">
                                <?php if (isset($view_data['list']) && is_array($view_data['list'])): ?>
                                    <?php foreach ($view_data['list'] as $row): ?>
                                    <label class="list-group-item d-flex justify-content-between align-items-center p-3" style="cursor: pointer; border-left:none; border-right:none;">
                                        <div>
                                            <div class="fw-bold" style="font-size: 1.5rem; color: #333; line-height: 1.2;"><?php echo esc_html($row['displayDate']); ?></div>
                                            <div class="text-secondary" style="font-size: 1.2rem;"><?php echo esc_html($row['displayTime']); ?></div>
                                        </div>
                                        <div class="text-end">
                                            <input type="hidden" name="cancel_ids[]" value="<?php echo esc_attr($row['id']); ?>" disabled id="cancel_<?php echo esc_attr($row['id']); ?>">
                                            <div class="d-flex align-items-center">
                                                <input class="form-check-input check-participation" type="checkbox" checked
                                                    data-target="cancel_<?php echo esc_attr($row['id']); ?>" 
                                                    style="transform: scale(1.6); cursor: pointer;">
                                                <span class="ms-3 badge bg-success rounded-pill status-badge" style="font-size: 1rem; padding: 0.6em 1em; min-width: 80px;">参加</span>
                                            </div>
                                        </div>
                                    </label>
                                    <?php endforeach; ?>
                                <?php else: ?>
                                    <p class="text-center fs-4 py-4">予定はありません。</p>
                                <?php endif; ?>
                            </div>

                            <p class="text-center text-danger fw-bold mb-3 fs-5">
                                ※キャンセルする（参加しない）日程のみ<br>チェックを外してください。
                            </p>

                            <div class="text-center mt-4">
                                <button type="submit" class="btn-cancel-custom pastel-blue shadow">
                                    上記の内容で確定する
                                </button>
                            </div>
                        </form>
                        
                        <script>
                        document.addEventListener('DOMContentLoaded', function() {
                            const checkboxes = document.querySelectorAll('.check-participation');
                            checkboxes.forEach(function(cb) {
                                cb.addEventListener('change', function() {
                                    const badge = this.nextElementSibling;
                                    const hiddenInput = document.getElementById(this.getAttribute('data-target'));
                                    
                                    if (this.checked) {
                                        badge.className = 'ms-3 badge bg-success rounded-pill status-badge';
                                        badge.textContent = '参加';
                                        hiddenInput.disabled = true; 
                                    } else {
                                        badge.className = 'ms-3 badge bg-secondary rounded-pill status-badge';
                                        badge.textContent = 'キャンセル';
                                        hiddenInput.disabled = false;
                                    }
                                });
                            });
                            
                            document.getElementById('monthlyForm').addEventListener('submit', function(e) {
                                if(!confirm('内容を確定してもよろしいですか？')) {
                                    e.preventDefault();
                                }
                            });
                        });
                        </script>
                    </div>
                <?php endif; ?>

            <?php endif; ?>

          </div>
        </div>
      </div>
    </section>

  </article>
</main>

<style>
/* 共通スタイル */
.btn-cancel-custom {
    display: inline-block;
    width: 100%;
    max-width: 350px;
    padding: 15px 20px;
    color: #fff;
    font-size: 1.4rem;
    font-weight: bold;
    text-align: center;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.3s;
    text-decoration: none;
    letter-spacing: 0.05em;
}

.pastel-red {
    background-color: #ef857d; 
}
.pastel-red:hover {
    background-color: #ea6f66;
    transform: translateY(-2px);
}

.pastel-blue {
    background-color: #7ab6e8; 
}
.pastel-blue:hover {
    background-color: #6aa5d8;
    transform: translateY(-2px);
}

.list-group-item:hover {
    background-color: #f8f9fa;
}

/* スマホ表示調整 */
@media (max-width: 768px) {
    .page-title {
        font-size: 2.0rem !important; 
    }
    .btn-cancel-custom {
        font-size: 1.2rem;
        padding: 14px;
    }
}
</style>

<?php get_footer(); ?>