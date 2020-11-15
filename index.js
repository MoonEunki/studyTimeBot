import aws from "aws-sdk";
const { config, DynamoDB } = aws;
config.loadFromPath("./config/aws_config.json");
const docClient = new DynamoDB.DocumentClient();

import RtmPkg from "@slack/rtm-api";
const { RTMClient } = RtmPkg;

import { tableName, token } from "./config/slack.js"; //이건 나중에 뺴야됨

const rtm = new RTMClient(token);

import {
  getUserData,
  plainTextSend,
  secondToHHMMSS,
  studyTimeSend,
} from "./utils.js";

/**
 * 비지니스 로직을 컨트롤러에 넣지마라 , 서비스 계층에 넣어라 (여기에 SQL넣지마라)
 *
 * rtm.on("message", async (message) => {}) 이부분은
 * 이벤트 처리하기도 바쁜데, CRUD 까지 하니까 이벤트 처리할때 그냥 user를 매개변수로 받는게 어떨까 싶다.
 * 에러 스택트레이스를 줄여야지.. 에러는 한데 모으는게 중요하다.
 *
 * crud 하기전에, 연산이 끝나고 연산검증해야됨 , 그래야 디버깅이 쉬움
 *
 *
 */

rtm.start();

rtm.on("message", async (message) => {
  //공부시작
  if (message.text === "!in") {
    const data = await getUserData(message.user);

    //결과값이 없는경우 신규유저
    if (data.Count === 0) {
      let params = {
        TableName: tableName,
        Item: {
          PK: message.user,
          SK: "status",
          status: 1,
          timeStamp: Math.floor(message.event_ts),
          stopTime: 0,
          stopTimeCalc: 0,
        },
      };
      docClient.put(params, (err, data) => {
        if (err) {
          plainTextSend("에러: 신규유저 등록 실패");
          return;
        }
        plainTextSend(`:computer: 공부를 시작했습니다`);
      });
    } else {
      if (data.Items[0].status === 0) {
        let params = {
          TableName: tableName,
          Item: {
            PK: message.user,
            SK: "status",
            status: 1,
            timeStamp: Math.floor(message.event_ts),
            stopTime: 0,
            stopTimeCalc: 0,
          },
        };
        docClient.put(params, (err, data) => {
          if (err) {
            plainTextSend("에러");
            return;
          }
          plainTextSend(`:computer: 공부를 시작했습니다`);
        });
      }
      if (data.Items[0].status === 1) {
        plainTextSend(":computer:`공부중`입니다");
      }
      if (data.Items[0].status === 2) {
        let stopTimeCalc =
          Math.floor(message.event_ts) - data.Items[0].stopTime; //second

        let params = {
          TableName: tableName,
          Item: {
            PK: message.user,
            SK: "status",
            status: 1,
            timeStamp: data.Items[0].timeStamp,
            stopTime: data.Items[0].stopTime,
            stopTimeCalc: data.Items[0].stopTimeCalc + stopTimeCalc,
          },
        };
        docClient.put(params, (err, data) => {
          if (err) {
            plainTextSend("에러" + err);
            return;
          }
          plainTextSend(
            ":computer:`공부중`입니다 (자리비움:`/stop`,공부종료:`/out`)"
          ); //공부시간,자리비움시간도 표시하게 하기?
        });
      }
    }
  }

  //공부종료
  if (message.text === "!out") {
    const data = await getUserData(message.user);

    //신규유저
    if (data.Count === 0) {
      plainTextSend("등록되지 않은 유저입니다");
    }
    //기존 유저
    else {
      //원래 공부 종료상태였던 유저
      if (data.Items[0].status === 0) {
        plainTextSend("공부를 종료한 유저입니다");
      }
      //공부중이었던 유저가 공부 종료
      if (data.Items[0].status === 1) {
        const userData = data.Items[0];

        let studyTime =
          Math.floor(message.event_ts) -
          userData.timeStamp -
          userData.stopTimeCalc; //second

        let params = {
          TableName: tableName,
          Item: {
            PK: message.user,
            SK: "status",
            status: 0,
            timeStamp: Math.floor(message.event_ts),
            stopTime: 0,
            stopTimeCalc: 0,
          },
        };
        docClient.put(params, (err, data) => {
          if (err) {
            plainTextSend("에러" + err);
            return;
          }
          console.log(userData.stopTimeCalc);
          plainTextSend(`공부를 종료했습니다.
          *순 공부시간*: ${secondToHHMMSS(studyTime)}
          *자리비움 시간*: ${secondToHHMMSS(userData.stopTimeCalc)}`);
        });
      }

      if (data.Items[0].status === 2) {
        plainTextSend(
          ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)"
        );
      }
    }
  }

  //현재 상태가 공부중인지 아닌지 알려주기
  if (message.text === "!status") {
    const data = await getUserData(message.user);

    //신규유저
    if (data.Count === 0) {
      plainTextSend("등록되지 않은 유저입니다");
    }
    //기존유저
    else {
      //공부중이 아닌유저
      if (data.Items[0].status === 0) {
        plainTextSend("공부를 종료한 유저입니다");
      }
      //공부중인 유저
      if (data.Items[0].status === 1) {
        let studyTime = Math.floor(message.event_ts) - data.Items[0].timeStamp; //second
        studyTimeSend(`공부중입니다.`, secondToHHMMSS(studyTime));
      }
      if (data.Items[0].status === 2) {
        plainTextSend(
          ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)다"
        ); // Todo:자리비움 시간도 보여줘야되나 ?
      }
    }
  }

  if (message.text === "!stop") {
    const data = await getUserData(message.user);
    //신규유저
    if (data.Count === 0) {
      plainTextSend("등록되지 않은 유저입니다");
    } else {
      if (data.Items[0].status === 0) {
        plainTextSend("공부를 종료한 유저입니다");
      }
      if (data.Items[0].status === 1) {
        let params = {
          TableName: tableName,
          Item: {
            PK: message.user,
            SK: "status",
            status: 2,
            stopTime: Math.floor(message.event_ts),
            timeStamp: data.Items[0].timeStamp,
            stopTimeCalc: data.Items[0].stopTimeCalc,
          },
        };
        docClient.put(params, (err, data) => {
          if (err) {
            plainTextSend("에러");
            return;
          }
          plainTextSend(
            ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)"
          );
        });
      }
      if (data.Items[0].status === 2) {
        plainTextSend(
          ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)"
        );
      }
    }
  }

  //명령어 띄어주기
  if (message.text === "!help") {
    plainTextSend(`
  도움말
  \`!in\` 공부시작
  \`!out\` 공부종료
  \`!stop\` 자리비움
  \`!status\` 현재상태
  `);
  }
});
