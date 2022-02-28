var height = document.querySelector(".spot").scrollHeight;
$(document).ready(function () {
  $(".a-top2").click(function () {
    $('.wrap').animate({
      scrollTop: height
    }, 1200);
    return false;
  });
  $(".acchead").click(function () {
    if ($(this).hasClass('active')){
      $(this).removeClass('active');
    } else {
      $(".acchead").removeClass('active');
    $(this).addClass('active');
    }
    return false;
  });
});

gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.defaults({
  scroller: ".wrap"
})
gsap.fromTo(".text,.a-top2", {
  opacity: 1
}, {
  scrollTrigger: {
    scrub: .5,
  },
  opacity: -0.5,
  duration: .5,
});
gsap.fromTo(".marquee_text", {
  left: -250
}, {
  scrollTrigger: {
    scrub: 2,
  },
  left: -1200,
  duration: .5,
});
gsap.fromTo(".bl-1", {
  height: "0"
}, {
  scrollTrigger: {
    trigger: ".cal-box",
    scrub: 1,
  },
  height: "150%",
  duration: .2,
});
gsap.fromTo(".bl-2", {
  height: "0"
}, {
  scrollTrigger: {
    trigger: ".cal-box",
    scrub: 1,
  },
  height: "140%",
  duration: .2,
});
gsap.fromTo(".bl-3", {
  height: "0"
}, {
  scrollTrigger: {
    trigger: ".cal-box",
    scrub: 1,
  },
  height: "130%",
  duration: .2,
});
gsap.fromTo(".bl-4", {
  height: "0"
}, {
  scrollTrigger: {
    trigger: ".cal-box",
    scrub: 1,
  },
  height: "120%",
  duration: .2,
});
gsap.fromTo(".bl-5", {
  height: "0"
}, {
  scrollTrigger: {
    trigger: ".cal-box",
    scrub: 1,
  },
  height: "110%",
  duration: .2,
});
gsap.fromTo(".bl-6", {
  height: "0"
}, {
  scrollTrigger: {
    trigger: ".cal-box",
    scrub: 1,
  },
  height: "100%",
  duration: .2,
});
const toastAni = gsap.timeline({
  paused: true
});
toastAni.from('.toast', {
  duration: 0,
  delay: 0,
  bottom: '40%',
  opacity: 0,
});
toastAni.to('.toast', {
  duration: 0,
  delay: 0,
  bottom: '40%',
  display: 'block',
  opacity: 0,
});
toastAni.to('.toast', {
  duration: 1,
  delay: 0,
  bottom: "49%",
  opacity: 1,
  ease: Expo.easeOut
});
toastAni.to('.toast', {
  duration: 1,
  delay: 0.6,
  bottom: "40%",
  opacity: 0,
  ease: Expo.easeIn
});
toastAni.to('.toast', {
  duration: 0,
  delay: 1.5,
  display: 'none'
});
$('.btn-copy,.copy-link,.address').click(function () {
  toastAni.restart();
});


function copyB01() {
  var copyText = document.getElementById("b01");
  copyText.select();
  document.execCommand("Copy");
  toastAni();
}

function copyB02() {
  var copyText = document.getElementById("b02");
  copyText.select();
  document.execCommand("Copy");
  toastAni();
}

function copyB03() {
  var copyText = document.getElementById("b03");
  copyText.select();
  document.execCommand("Copy");
  toastAni();
}

function copyB04() {
  var copyText = document.getElementById("b04");
  copyText.select();
  document.execCommand("Copy");
  toastAni();
}
function copyPlace() {
  var copyText = document.getElementById("place");
  copyText.select();
  document.execCommand("Copy");
  toastAni();
}

function copyLink() {
  var copyText = document.getElementById("thislink");
  copyText.select();
  document.execCommand("Copy");
  toastAni();
}
var swiper = new Swiper(".mySwiper", {
  spaceBetween: 5,
  noSwiping: 'true',
  slidesPerView: 'auto',
});
swiper.init();

var swiper2 = new Swiper(".mySwiper2", {
  spaceBetween: 0,
  centeredSlides: true,
  slidesPerView: 1,
  thumbs: {
    swiper: swiper
  },
});

var swiper3 = new Swiper(".mySwiper3", {
  direction: 'vertical',
  spaceBetween: 1,
  centeredSlides: true,
  slidesPerView: 1,
  autoplay: {
    delay: 1800,
    disableOnInteraction: false,
    reverseDirection: true,
  },
  loop: 'infinity',
  mousewheel: {},
});

var scrollTopRatio;

function getScrollTop() {
  if (document.scrollingElement && document.scrollingElement.scrollHeight) {
    scrollTopRatio = $(document).height() / document.scrollingElement.scrollHeight;
  } else {
    scrollTopRatio = 1;
  }
  return $(window).scrollTop() * scrollTopRatio;
}

function aniChecker() {
  $('.ani').each(function (index) {
    var pos = $(this).offset(),
      wY = getScrollTop(),
      wH = $(window).height(),
      oH = $(this).outerHeight();
    var posTop = pos.top;
    if (posTop >= wY && oH + posTop <= wY + wH) {
      $(this).addClass('active');
    } else if ((posTop <= wY && posTop + oH > wY) || (posTop >= wY && posTop <= wY + wH - 50)) {
      $(this).addClass('active');
    } else {
      if (posTop === wY) {
        $(this).addClass('active');
      } else {

      }
    }
  });
}
$('.wrap').scroll(function () {
  aniChecker();
});

function sendLinkCustom() {
  Kakao.init("4c199b94451dab5dd3c0b3060fd1abaf");
  Kakao.Link.sendCustom({
      templateId: 72115
  });
}

// try {
//   function sendLinkDefault() {
//     Kakao.init('[Javascript API key]')
//     Kakao.Link.sendDefault({
//       objectType: 'feed',
//       content: {
//         title: '딸기 치즈 케익',
//         description: '#케익 #딸기 #삼평동 #카페 #분위기 #소개팅',
//         imageUrl:
//           'http://k.kakaocdn.net/dn/Q2iNx/btqgeRgV54P/VLdBs9cvyn8BJXB3o7N8UK/kakaolink40_original.png',
//         link: {
//           mobileWebUrl: 'https://developers.kakao.com',
//           webUrl: 'https://developers.kakao.com',
//         },
//       },
//       social: {
//         likeCount: 286,
//         commentCount: 45,
//         sharedCount: 845,
//       },
//       buttons: [
//         {
//           title: '웹으로 보기',
//           link: {
//             mobileWebUrl: 'https://developers.kakao.com',
//             webUrl: 'https://developers.kakao.com',
//           },
//         },
//         {
//           title: '앱으로 보기',
//           link: {
//             mobileWebUrl: 'https://developers.kakao.com',
//             webUrl: 'https://developers.kakao.com',
//           },
//         },
//       ],
//     })
//   }
// ; window.kakaoDemoCallback && window.kakaoDemoCallback() }
// catch(e) { window.kakaoDemoException && window.kakaoDemoException(e) }