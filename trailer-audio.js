(function () {
  var player = null;
  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  var first = document.getElementsByTagName("script")[0];
  first.parentNode.insertBefore(tag, first);

  window.onYouTubeIframeAPIReady = function () {
    var el = document.getElementById("trailerEmbed");
    if (!el || typeof YT === "undefined" || !YT.Player) return;
    player = new YT.Player("trailerEmbed", {
      events: {
        onStateChange: function (e) {
          var music = window.ManafallMusic;
          if (!music) return;
          // 1 = playing, 3 = buffering (treat as playing for ducking)
          if (e.data === 1 || e.data === 3) music.duckForTrailer();
          // 0 ended, 2 paused, 5 cued
          else if (e.data === 0 || e.data === 2 || e.data === 5) music.unduckFromTrailer();
        }
      }
    });
  };
})();
