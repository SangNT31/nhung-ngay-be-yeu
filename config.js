// Tạo API key tại Google Cloud Console, bật Google Drive API và giới hạn key theo domain.
// Chia sẻ thư mục Drive ở chế độ "Bất kỳ ai có đường liên kết đều có thể xem".
window.ALBUM_CONFIG = {
  googleDriveApiKey: "AIzaSyC6bnpr5YEeDTk_an1lu4BaBUU1Hxah1Cc",
  googleDriveFolderId: "13tKdwPE2_VWAHGSPQNHdJHjnjhpY1IGk",
  albumTitle: "Những ngày bé lớn khôn",
  slideDuration: 6000,
  maxImageWidth: 1600,
  musicTracks: [
    {
      name: "Chú Ong Nâu Và Bé - Bé Mai Vy",
      src: "assets/music/Ch-Ong-Nu-V-B--B-Mai-Vy--Bi-ht-lyrics.mp3",
    },
    {
      name: "Em Bé Khỏe Em Bé Ngoan - Bé Minh Thư",
      src: "assets/music/Em-B-Khe-Em-B-Ngoan--B-Minh-Th--Bi-ht-lyrics.mp3",
    },
    {
      name: "Top 100 Nhạc Thiếu Nhi Hay Nhất",
      src: "assets/music/Top-100-Nhc-Thiu-Nhi-Hay-Nht--Album-320-lossless.mp3",
    },
    {
      name: "Top 100 Nhạc Thiếu Nhi Hay Nhất 2",
      src: "assets/music/Top-100-Nhc-Thiu-Nhi-Hay-Nht--Album-320-lossless (1).mp3",
    },
  ],
  firebase: {
    apiKey: "AIzaSyAvjuQaeGxdokM1QjoUrNlrFPozQ8NgO4o",
    authDomain: "baby-album-baf4d.firebaseapp.com",
    databaseURL: "https://baby-album-baf4d-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "baby-album-baf4d",
    storageBucket: "baby-album-baf4d.firebasestorage.app",
    messagingSenderId: "589281741214",
    appId: "1:589281741214:web:d106e0a70f77e7a985ae8f",
  },
};
