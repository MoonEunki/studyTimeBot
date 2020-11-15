import {
  botName,
  tableName,
  token,
  channelName,
  icon_emoji,
} from "./config/slack.js";

import Slack from "slack-node";
const slack = new Slack(token);

import aws from "aws-sdk";
const { config, DynamoDB } = aws;
config.loadFromPath("./config/aws_config.json");
const docClient = new DynamoDB.DocumentClient();

/*
 * longMessage, shortMessage 라는 util 의 함수를 만들어서
 * 메시지 포맷 json을 리턴방식으로 받는게, 가독성이 훨씬 좋을거같다
 */
const plainTextSend = async (message) => {
  slack.api(
    "chat.postMessage",
    {
      username: botName, // 슬랙에 표시될 봇이름
      channel: channelName, // 메시지가 전송될 채널
      icon_emoji: icon_emoji, // 봇 아이콘
      text: message, //전송할 text
    },
    (err, response) => {
      //   console.log(response, err);
    }
  );
};

const studyTimeSend = async (message, time) => {
  slack.api(
    "chat.postMessage",
    {
      username: botName, // 슬랙에 표시될 봇이름
      channel: channelName, // 메시지가 전송될 채널
      icon_emoji: icon_emoji, // 봇 아이콘
      text: message, //전송할 text
      attachments: JSON.stringify([
        {
          color: "#3399FF", //파란색
          // color: "#36a64f", //초록색
          text: `공부시간 \`${time}\` `,
        },
      ]),
    },
    (err, response) => {
      // console.log(response)
    }
  );
};

// * secondToHHMMSS 함수는 타임라이브러리 쓰면 2~3줄로 가능할듯.
// const dayjs = require("dayjs");
// dayjs("1900-01-01 00:00:00").add(870000, "seconds").format("HH:mm:ss")
const secondToHHMMSS = (second) => {
  let sec_num = parseInt(second, 10);
  let hours = Math.floor(sec_num / 3600);
  let minutes = Math.floor((sec_num - hours * 3600) / 60);
  let seconds = sec_num - hours * 3600 - minutes * 60;

  hours < 10 ? (hours = `0${hours}`) : hours;
  minutes < 10 ? (minutes = `0${minutes}`) : minutes;
  seconds < 10 ? (seconds = `0${seconds}`) : seconds;

  return `${hours}시 ${minutes}분 ${seconds}초`;
};

/* getUserData 가 굳이 이 로직단에 있을필요가 있나 ? 모듈로 충분히 뺼수있을거같다.
 * index.js 에는 rtm 서비스 로직만 충실 하는게 좋을거같다
 * 설정에 crud에 중점 비지니스로직이 다 있어서 혼란하다
 */
const getUserData = (userId) => {
  return new Promise((resolve, reject) => {
    const params = {
      TableName: tableName,
      KeyConditionExpression: "PK = :PK and SK = :SK",
      ExpressionAttributeValues: {
        ":PK": userId,
        ":SK": "status",
      },
    };

    docClient.query(params, (err, data) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log(data);
        resolve(data);
      }
    });
  });
};

/* config랑 utils 로 조합하는게 어떨까.
 * 설정 파일을 세팅해서 넘겨주는 configs/slack.ts 랑
 * utils.studyTimeSend 같은걸로 단일화 하는것도 생각해봐라
 */

export { plainTextSend, studyTimeSend, secondToHHMMSS, getUserData };
