const Icon = ({ children, className = "" }) => <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{children}</svg>;

export default function AlbumPage() {
  return <>
    <main className="app" aria-live="polite">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Về ảnh đầu tiên">
          <span className="brand-mark" aria-hidden="true"><Icon><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" /></Icon></span>
          <span>Những ngày bé xinh</span>
        </a>
        <div className="topbar-actions">
          <button className="icon-button" id="galleryButton" aria-label="Mở thư viện ảnh" title="Xem dạng lưới"><Icon><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></Icon></button>
          <button className="icon-button install-button" id="installButton" aria-label="Cài album như ứng dụng" title="Cài ứng dụng" hidden><Icon><path d="M12 3v12M7 10l5 5 5-5M5 20h14" /></Icon></button>
          <button className="icon-button music-button" id="musicButton" aria-label="Bật nhạc nền" aria-pressed="false" title="Nhạc nền"><Icon><path d="M9 18V5l10-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></Icon></button>
          <button className="icon-button" id="fullscreenButton" aria-label="Xem toàn màn hình" title="Toàn màn hình"><Icon><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></Icon></button>
        </div>
      </header>

      <section className="viewer" id="viewer" aria-label="Trình chiếu ảnh">
        <div className="ambient" id="ambient"></div>
        <div className="slide-frame">
          <div className="loading" id="loading"><span></span><span></span><span></span></div>
          <img id="photo" className="media-photo ready" alt="" draggable="false" decoding="async" fetchPriority="high" />
          <img id="photoBuffer" className="media-photo" alt="" draggable="false" decoding="async" />
          <video id="video" controls playsInline muted preload="auto" aria-label="Video trong album"></video>
          <div className="shade"></div>
          <div className="caption">
            <p className="eyebrow" id="eyebrow">KHOẢNH KHẮC CỦA CON</p>
            <h1 id="captionTitle">Mỗi ngày bên con<br />là một món quà.</h1>
            <p id="captionMeta">Một album nhỏ đầy yêu thương</p>
          </div>
          <p className="demo-badge" id="demoBadge">Ảnh minh hoạ • Xem README để kết nối Drive</p>
          <div className="social-actions" aria-label="Tương tác với ảnh">
            <button className="social-button heart-button" id="heartButton" aria-label="Thả tim ảnh này" aria-pressed="false">
              <Icon><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" /></Icon><span id="heartCount">0</span>
            </button>
            <button className="social-button" id="commentButton" aria-label="Mở bình luận">
              <Icon><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /></Icon><span id="commentCount">0</span>
            </button>
            <button className="social-button share-button" id="shareButton" aria-label="Chia sẻ nội dung này" title="Chia sẻ">
              <Icon><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" /></Icon>
            </button>
          </div>
        </div>
        <button className="nav prev" id="prevButton" aria-label="Ảnh trước"><Icon><path d="m15 18-6-6 6-6" /></Icon></button>
        <button className="nav next" id="nextButton" aria-label="Ảnh tiếp theo"><Icon><path d="m9 18 6-6-6-6" /></Icon></button>
      </section>

      <footer className="controls">
        <button className="play-button" id="playButton" aria-label="Tạm dừng trình chiếu">
          <Icon className="pause-icon"><path d="M9 5v14M15 5v14" /></Icon>
          <Icon className="play-icon"><path d="m8 5 11 7-11 7Z" /></Icon>
        </button>
        <div className="progress" id="progress" aria-label="Tiến trình album"></div>
        <p className="counter"><span id="currentIndex">01</span><span>/</span><span id="totalCount">03</span></p>
      </footer>
    </main>

    <button className="sound-prompt" id="soundPrompt" type="button" hidden><span aria-hidden="true">♫</span>Bật trải nghiệm có nhạc</button>

    <section className="gallery-panel" id="galleryPanel" aria-hidden="true" aria-labelledby="galleryHeading">
      <header className="gallery-header"><div><p className="eyebrow drawer-eyebrow">DÒNG THỜI GIAN</p><h2 id="galleryHeading">Mọi khoảnh khắc</h2></div><button className="icon-button" id="closeGallery" aria-label="Đóng thư viện">×</button></header>
      <div className="gallery-timeline" id="galleryTimeline"></div>
    </section>

    <div className="drawer-backdrop" id="drawerBackdrop"></div>
    <aside className="comment-drawer" id="commentDrawer" aria-hidden="true" aria-labelledby="commentHeading">
      <header className="drawer-header">
        <div><p className="eyebrow drawer-eyebrow">GÓC YÊU THƯƠNG</p><h2 id="commentHeading">Bình luận chung</h2></div>
        <button className="icon-button drawer-close" id="closeComments" aria-label="Đóng bình luận">×</button>
      </header>
      <div className="comment-list" id="commentList"></div>
      <form className="comment-form" id="commentForm">
        <label className="sr-only" htmlFor="commentName">Tên của bạn</label>
        <input id="commentName" maxLength="32" autoComplete="name" placeholder="Tên của bạn" required />
        <label className="sr-only" htmlFor="commentText">Nội dung bình luận</label>
        <div className="comment-compose">
          <textarea id="commentText" maxLength="280" rows="1" placeholder="Viết lời yêu thương…" required></textarea>
          <button type="submit" aria-label="Gửi bình luận"><Icon><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></Icon></button>
        </div>
      </form>
    </aside>
    <div className="error-toast" id="errorToast" role="alert"></div>
    <script type="module" src="/config.js"></script>
    <script type="module" src="/app.js"></script>
  </>;
}
