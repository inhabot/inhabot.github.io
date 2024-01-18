// var height = document.querySelector(".spot").scrollHeight;
// $(document).ready(function () {
//   $(".a-top2").click(function () {
//     $('.wrap').animate({
//       scrollTop: height
//     }, 1200);
//     return false;
//   });
//   $(".acchead").click(function () {
//     if ($(this).hasClass('active')){
//       $(this).removeClass('active');
//     } else {
//       $(".acchead").removeClass('active');
//     $(this).addClass('active');
//     }
//     return false;
//   });
// });

gsap.registerPlugin(ScrollTrigger);

ScrollTrigger.defaults({
  scroller: "body"
})
gsap.fromTo(".spot", {
  opacity: 1
}, {
  scrollTrigger: {
    scrub: 0.5,
  },
  opacity: -2,
  duration: .5,
});

gsap.fromTo(".screen-inner", {
  opacity: 1
}, {
  scrollTrigger: {
    scrub: 0.1,
  },
  opacity: -0.5,
  duration: .1,
});

// 달력 세로 선 차례로 내려오는거
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
toastAni.from('.nav-menu', {
  // maxheight: "100%",
  opacity:1,

});
toastAni.to('.nav-menu', {
  // duration: 0,
  // delay: 0,
  // maxheight: 0,
  opacity:0,
});
$('.floating-button.active').click(function () {
  toastAni.restart();
});

// pack
gsap.fromTo(".img-pack", {
  left: 0,
}, {
  scrollTrigger: {
    trigger: ".section-pack",
    scrub: 1,
  },
  left: 390,
  duration: .2,
});



//scroll ani -- // 
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
    } else if ((posTop <= wY && posTop + oH > wY) || (posTop >= wY && posTop <= wY + wH - 160)) {
      $(this).addClass('active');
    } else {
      if (posTop === wY) {
        $(this).addClass('active');
      } else {
        // $(this).removeClass('active');
      }
    }
  });
}
// 타이핑 한글
var isTypeHangulExecuted = {
  talk01: false,
  talk02: false,
  talk03: false,
  talk04: false,
  // talk05: false,
};

function checkAndExecuteTypeHangul(targetClass, executedFlag) {
  var $target = document.querySelector('.' + targetClass + '.ani.active');
  if ($target && !isTypeHangulExecuted[executedFlag]) {
    TypeHangul.type('.' + targetClass + '.ani.active', {intervalType: 60});
    isTypeHangulExecuted[executedFlag] = true;
  }
}

$('body').scroll(function () {
  var scroll = $('body').scrollTop();
  if (scroll > 0) {
      $(".nav").addClass("scroll");
  } else {
      $(".nav").removeClass("scroll");
  }
  aniChecker();
  checkAndExecuteTypeHangul('talk01', 'talk01');
  checkAndExecuteTypeHangul('talk02', 'talk02');
  checkAndExecuteTypeHangul('talk03', 'talk03');
  checkAndExecuteTypeHangul('talk04', 'talk04');
  // checkAndExecuteTypeHangul('talk05', 'talk05');
});
