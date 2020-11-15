import RtmPkg from "@slack/rtm-api";
import { token } from "./config/slack.js";
import {
  simpleMessage,
  timeMessage,
  sendMessage,
  secondToHHmmss,
} from "./utils.js";
import {
  getUserData,
  startStudy,
  restartStudy,
  endStudy,
  stopStudy,
} from "./dynamo.js";

const { RTMClient } = RtmPkg;
const rtm = new RTMClient(token);

rtm.start();

rtm.on("message", async (message) => {
  //공부시작
  if (message.text === "!in") {
    const data = await getUserData(message.user);

    //결과값이 없는경우 신규유저
    if (data.Count === 0) {
      startStudy(message.user, message.event_ts);
      return;
      // return 여기서 리턴때리면, 신규유저는 바로 동작 끝인가? 그럼 else 굳이 필요없는데
      //data.Items[] 거슬려서 다른변수에 넣는게 나을듯
    } else {
      let userData = data.Items[0];

      if (userData.status === 0) {
        startStudy(message.user, message.event_ts);
      }

      if (userData.status === 1) {
        sendMessage(simpleMessage(":computer:`공부중`입니다"));
      }

      if (userData.status === 2) {
        let stopTimeCalc =
          userData.stopTimeCalc +
          Math.floor(message.event_ts) -
          userData.stopTime; //second
        restartStudy(message.user, stopTimeCalc);
      }
    }
  }

  //공부종료
  if (message.text === "!out") {
    const data = await getUserData(message.user);

    if (data.Count === 0) {
      sendMessage(simpleMessage("등록되지 않은 유저입니다"));
    } else {
      let userData = data.Items[0];

      if (userData.status === 0) {
        sendMessage(simpleMessage("공부를 종료한 유저입니다"));
      }

      if (userData.status === 1) {
        let studyTime =
          Math.floor(message.event_ts) -
          userData.timeStamp -
          userData.stopTimeCalc; //second

        endStudy(message.user, studyTime, userData.stopTimeCalc);
      }

      if (data.Items[0].status === 2) {
        sendMessage(
          simpleMessage(
            ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)"
          )
        );
      }
    }
  }

  //현재 상태가 공부중인지 아닌지 알려주기
  if (message.text === "!status") {
    const data = await getUserData(message.user);

    //신규유저
    if (data.Count === 0) {
      sendMessage(simpleMessage("등록되지 않은 유저입니다"));
    }
    //기존유저
    else {
      //공부중이 아닌유저
      if (data.Items[0].status === 0) {
        sendMessage(simpleMessage("공부를 종료한 유저입니다"));
      }
      //공부중인 유저
      if (data.Items[0].status === 1) {
        let studyTime = Math.floor(message.event_ts) - data.Items[0].timeStamp; //second
        sendMessage(
          timeMessage(
            `(순공부시간아님,고쳐야됨)공부중입니다.`,
            secondToHHmmss(studyTime)
          )
        );
      }
      if (data.Items[0].status === 2) {
        sendMessage(
          simpleMessage(
            ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)다"
          )
        ); // Todo:자리비움 시간도 보여줘야되나 ?
      }
    }
  }

  if (message.text === "!stop") {
    const data = await getUserData(message.user);
    //신규유저
    if (data.Count === 0) {
      sendMessage(simpleMessage("등록되지 않은 유저입니다"));
    } else {
      if (data.Items[0].status === 0) {
        sendMessage(simpleMessage("공부를 종료한 유저입니다"));
      }
      if (data.Items[0].status === 1) {
        stopStudy(message.user, message.event_ts);
      }

      if (data.Items[0].status === 2) {
        sendMessage(
          simpleMessage(
            ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)"
          )
        );
      }
    }
  }

  //명령어 띄어주기
  if (message.text === "!help") {
    sendMessage(
      simpleMessage(`
  도움말
  \`!in\` 공부시작
  \`!out\` 공부종료
  \`!stop\` 자리비움
  \`!status\` 현재상태
  `)
    );
  }
});
