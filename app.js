const navButtons = document.querySelectorAll(".bottom-nav button");
const views = document.querySelectorAll(".app-view");
const fortuneTabs = document.querySelectorAll(".fortune-tab");
const luckyTitle = document.querySelector("#lucky-title");
const luckyCopy = document.querySelector("#lucky-copy");
const recordButtons = document.querySelectorAll("[data-record-toggle]");
const homeStates = document.querySelectorAll(".home-state");
const homeView = document.querySelector("#home-view");
const drawTimer = document.querySelector(".draw-status strong");
let homeDrawTimers = [];

const fortuneContent = {
  mix: {
    title: "補火底色，金色點綴",
    copy: "今天用番茄紅當主色，讓行動力先醒過來；金色耳環留一點太陽感，讓整體不要太用力。",
  },
  wuxing: {
    title: "今日宜補火",
    copy: "衣櫥裡的紅、橙、紫會比冷色更合拍。選一件有存在感的上衣，讓決策速度變快。",
  },
  astro: {
    title: "太陽感小物日",
    copy: "占星顧問偏向金色與暖調飾品。把亮點放在耳環或包款，讓日常穿搭多一點舞台感。",
  },
};

const clearHomeDrawTimers = () => {
  homeDrawTimers.forEach((timer) => clearTimeout(timer));
  homeDrawTimers = [];
};

const startHomeDraw = () => {
  if (!homeView) return;

  clearHomeDrawTimers();
  homeView.classList.remove("is-revealing", "is-ready", "is-drawing");
  void homeView.offsetWidth;
  homeView.classList.add("is-drawing");

  if (drawTimer) drawTimer.textContent = "00:05";

  for (let second = 1; second <= 5; second += 1) {
    homeDrawTimers.push(
      setTimeout(() => {
        if (drawTimer) drawTimer.textContent = `00:0${5 - second}`;
      }, second * 1000),
    );
  }

  homeDrawTimers.push(
    setTimeout(() => {
      homeView.classList.add("is-revealing");
    }, 3000),
  );

  homeDrawTimers.push(
    setTimeout(() => {
      homeView.classList.remove("is-drawing");
      homeView.classList.add("is-ready");
    }, 5000),
  );
};

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.view;

    navButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");

    views.forEach((view) => {
      view.classList.toggle("is-active", view.id === target);
      if (view.id === target) view.scrollTop = 0;
    });

    if (target === "home-view") {
      startHomeDraw();
    }
  });
});

fortuneTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const content = fortuneContent[tab.dataset.mode];

    fortuneTabs.forEach((item) => item.classList.remove("is-selected"));
    tab.classList.add("is-selected");

    if (luckyTitle && luckyCopy) {
      luckyTitle.textContent = content.title;
      luckyCopy.textContent = content.copy;
    }
  });
});

recordButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const recordedState = document.querySelector('[data-state="recorded"]');
    const nextIsRecorded = !recordedState?.classList.contains("is-active");

    homeStates.forEach((state) => {
      state.classList.toggle("is-active", state.dataset.state === (nextIsRecorded ? "recorded" : "empty"));
    });

    recordButtons.forEach((item) => {
      if (item.classList.contains("circle-cta")) {
        item.textContent = nextIsRecorded ? "重拍" : "記錄";
      }
    });
  });
});

startHomeDraw();
