import Slack from "slack-node";
import { botName, token, channelName, icon_emoji } from "./config/slack.js";

const slack = new Slack(token);

/*
 * longMessage, shortMessage 라는 util 의 함수를 만들어서
 * 메시지 포맷 json을 리턴방식으로 받는게, 가독성이 훨씬 좋을거같다
 */

const longMessage = (text, time) => {
  return {
    username: botName, // 슬랙에 표시될 봇이름
    channel: channelName, // 메시지가 전송될 채널
    icon_emoji: icon_emoji, // 봇 아이콘
    text: text, //전송할 text
    attachments: JSON.stringify([
      {
        color: "#3399FF", //파란색
        text: `공부시간 \`${time}\` `,
      },
    ]),
  };
};

const shortMessage = (text) => {
  return {
    username: botName, // 슬랙에 표시될 봇이름
    channel: channelName, // 메시지가 전송될 채널
    icon_emoji: icon_emoji, // 봇 아이콘
    text: text, //전송할 text
  };
};

const plainTextSend = async (text) => {
  slack.api("chat.postMessage", shortMessage(text), (err, response) => {
    //   console.log(response, err);
  });
};

const studyTimeSend = async (text, time) => {
  slack.api("chat.postMessage", longMessage(text, time), (err, response) => {
    // console.log(response)
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

/* config랑 utils 로 조합하는게 어떨까.
 * 설정 파일을 세팅해서 넘겨주는 configs/slack.ts 랑
 * utils.studyTimeSend 같은걸로 단일화 하는것도 생각해봐라
 */

export { plainTextSend, studyTimeSend, secondToHHmmss };
