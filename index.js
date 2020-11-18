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
  if (message.text === "!in") {
    const data = await getUserData(message.user);

    if (data.Count === 0) {
      startStudy(message.user, message.event_ts);
      return;
    }
    let userData = data.Items[0];

    if (userData.status === 0) {
      startStudy(message.user, message.event_ts);
    }

    if (userData.status === 1) {
      sendMessage(simpleMessage(":computer: 이미 `공부중`입니다"));
    }

    if (userData.status === 2) {
      let stopTimeCalc =
        userData.stopTimeCalc +
        Math.floor(message.event_ts) -
        userData.stopTime;

      restartStudy(message.user, stopTimeCalc);
    }
  }

  if (message.text === "!out") {
    const data = await getUserData(message.user);

    if (data.Count === 0) {
      sendMessage(simpleMessage("등록되지 않은 유저입니다"));
    } else {
      let userData = data.Items[0];

      if (userData.status === 0) {
        sendMessage(simpleMessage("이미 공부를 종료한 유저입니다"));
      }

      if (userData.status === 1) {
        let studyTime =
          Math.floor(message.event_ts) -
          userData.timeStamp -
          userData.stopTimeCalc;

        endStudy(message.user, studyTime, userData.stopTimeCalc);
      }

      if (userData.status === 2) {
        sendMessage(
          simpleMessage(
            ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)"
          )
        );
      }
    }
  }

  if (message.text === "!status") {
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
          userData.stopTimeCalc;

        sendMessage(
          timeMessage(
            `공부중입니다.`,
            secondToHHmmss(studyTime),
            secondToHHmmss(userData.stopTimeCalc)
          )
        );
      }
      if (userData.status === 2) {
        sendMessage(
          simpleMessage(
            ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)"
          )
        );
      }
    }
  }

  if (message.text === "!stop") {
    const data = await getUserData(message.user);
    if (data.Count === 0) {
      sendMessage(simpleMessage("등록되지 않은 유저입니다"));
    } else {
      let userData = data.Items[0];

      if (userData.status === 0) {
        sendMessage(simpleMessage("공부를 종료한 유저입니다"));
      }
      if (userData.status === 1) {
        stopStudy(message.user, message.event_ts);
      }

      if (userData.status === 2) {
        sendMessage(
          simpleMessage(
            ":hourglass_flowing_sand: 이미 `자리비움중` 입니다 (다시 시작 `!in`)"
          )
        );
      }
    }
  }

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
