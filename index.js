const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/aws_config.json");
const slack_config = require("./config/slack_config.json");
const Slack = require("slack-node");
const RtmPkg = require("@slack/rtm-api");
const { RTMClient } = RtmPkg;
const docClient = new AWS.DynamoDB.DocumentClient();

const token = slack_config.token; // slack token
const rtm = new RTMClient(token);
const slack = new Slack(token);
const tableName = slack_config.tableName; //DynamoDB table name

const plainTextSend = async (message) => {
  slack.api(
    "chat.postMessage",
    {
      username: slack_config.botName, // 슬랙에 표시될 봇이름
      channel: slack_config.channel, // 메시지가 전송될 채널
      icon_emoji: slack_config.icon, // 봇 아이콘
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
      username: slack_config.botName, // 슬랙에 표시될 봇이름
      channel: slack_config.channel, // 메시지가 전송될 채널
      icon_emoji: slack_config.icon, // 봇 아이콘
      text: message, //전송할 text
      attachments: JSON.stringify([
        {
          color: "#36a64f",
          text: `공부시간 \`${time}\` `,
        },
      ]),
    },
    (err, response) => {
      // console.log(response)
    }
  );
};

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

rtm.start();

rtm.on("message", async (message) => {
  //공부시작
  if (message.text === "!in") {
    const data = await getUserData(message.user);

    //결과값이 없는경우 신규유저다
    if (data.Items.length === 0) {
      let params = {
        TableName: tableName,
        Item: {
          PK: message.user,
          SK: "status",
          status: 1,
          timestamp: Math.floor(message.event_ts),
        },
      };
      docClient.put(params, (err, data) => {
        if (err) {
          plainTextSend("신규유저 등록 실패");
          return;
        }
        plainTextSend(`공부를 시작했습니다`);
      });
    } else {
      if (data.Items[0].status === 1) {
        plainTextSend(`공부중인 유저입니다`);
      }
      //공부 안하고있던 유저
      else if (data.Items[0].status === 0) {
        let params = {
          TableName: tableName,
          Item: {
            PK: message.user,
            SK: "status",
            status: 1,
            timestamp: Math.floor(message.event_ts),
          },
        };
        docClient.put(params, (err, data) => {
          if (err) {
            plainTextSend("에러");
            return;
          }
          plainTextSend(`공부를 시작했습니다`);
        });
      }
    }
  }

  //공부종료
  if (message.text === "!out") {
    const data = await getUserData(message.user);

    //신규유저
    if (data.Items.length === 0) {
      plainTextSend("등록되지 않은 유저입니다");
    }
    //기존 유저
    else {
      //공부중이었던 유저가 공부 종료
      if (data.Items[0].status === 1) {
        let studyTime = Math.floor(message.event_ts) - data.Items[0].timestamp; //second

        let params = {
          TableName: tableName,
          Item: {
            PK: message.user,
            SK: "status",
            status: 0,
            timestamp: Math.floor(message.event_ts),
          },
        };
        docClient.put(params, (err, data) => {
          if (err) {
            plainTextSend("에러");
            return;
          }
          studyTimeSend(`공부를 종료했습니다.`, secondToHHMMSS(studyTime));
        });
      }
      //원래 공부 종료상태였던 유저
      if (data.Items[0].status === 0) {
        plainTextSend("공부를 종료한 유저입니다");
      }
    }
  }

  //현재 상태가 공부중인지 아닌지 알려주기
  if (message.text === "!status") {
    const data = await getUserData(message.user);

    //신규유저
    if (data.Items.length === 0) {
      plainTextSend("등록되지 않은 유저입니다");
    }
    //기존유저
    else {
      //공부중인 유저
      if (data.Items[0].status === 1) {
        let studyTime = Math.floor(message.event_ts) - data.Items[0].timestamp; //second
        studyTimeSend(`공부중입니다.`, secondToHHMMSS(studyTime));
      }
      //공부중이 아닌유저
      else if (data.Items[0].status === 0) {
        plainTextSend("공부를 종료한 유저입니다");
      }
    }
  }

  //명령어 띄어주기
  if (message.text === "!help") {
    plainTextSend(`
  도움말
  \`!in\` 공부시작
  \`!out\` 공부종료
  \`!status\` 현재상태
      `);
  }
});
