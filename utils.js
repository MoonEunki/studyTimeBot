import Slack from "slack-node";
import { botName, token, channelName, icon_emoji } from "./config/slack.js";

const slack = new Slack(token);

const timeMessage = (text, studyTime, stopTime) => {
  return {
    username: botName, // 슬랙에 표시될 봇이름
    channel: channelName, // 메시지가 전송될 채널
    icon_emoji: icon_emoji, // 봇 아이콘
    text: text, //전송할 text
    attachments: JSON.stringify([
      {
        color: "#3399FF", //파란색
        text: `
순 공부시간 :\`${studyTime}\` 
자리비움 시간 :\`${stopTime}\` `,
      },
    ]),
  };
};

const simpleMessage = (text) => {
  return {
    username: botName, // 슬랙에 표시될 봇이름
    channel: channelName, // 메시지가 전송될 채널
    icon_emoji: icon_emoji, // 봇 아이콘
    text: text, //전송할 text
  };
};

const sendMessage = async (json) => {
  slack.api("chat.postMessage", json, (err, response) => {
    //   console.log(response, err);
  });
};

// * secondToHHMMSS 함수는 타임라이브러리 쓰면 2~3줄로 가능할듯.
// const dayjs = require("dayjs");
// dayjs("1900-01-01 00:00:00").add(870000, "seconds").format("HH:mm:ss")
const secondToHHmmss = (second) => {
  let sec_num = parseInt(second, 10);
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - hours * 3600) / 60);
  let seconds = sec_num - hours * 3600 - minutes * 60;

  hours < 10 ? (hours = `0${hours}`) : hours;
  minutes < 10 ? (minutes = `0${minutes}`) : minutes;
  seconds < 10 ? (seconds = `0${seconds}`) : seconds;

  return `${hours}시 ${minutes}분 ${seconds}초`;
};

export { simpleMessage, timeMessage, secondToHHmmss, sendMessage };
