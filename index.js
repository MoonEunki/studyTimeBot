const AWS = require("aws-sdk");
AWS.config.loadFromPath("./config/aws_config.json"); 
const docClient = new AWS.DynamoDB.DocumentClient();

const Slack = require("slack-node");
const RtmPkg = require("@slack/rtm-api");
const slack_config = require("./config/slack_config.json");
const { RTMClient } = RtmPkg;

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

  if (hours < 10) {
    hours = `0${hours}`;
  }
  if (minutes < 10) {
    minutes = `0${minutes}`;
  }
  if (seconds < 10) {
    seconds = `0${seconds}`;
  }
  return `${hours}시 ${minutes}분 ${seconds}초`;
};

rtm.start();

rtm.on("message", (message) => {
  if (message.text === "!in") {
    let params = {
      TableName: tableName,
      KeyConditionExpression: "PK = :PK and SK = :SK",
      ExpressionAttributeValues: {
        ":PK": message.user,
        ":SK": "status",
      },
    };

    docClient.query(params, (err, data) => {
      if (err) {
        // console.error(` select 실패${err}`);
        return;
      }

      //결과값이 없는경우 신규유저다
      if (data.Items.length === 0) {
        let ts = Date.now();
        let params = {
          TableName: tableName,
          Item: {
            PK: message.user,
            SK: "status",
            status: 1,
            timestamp: Math.floor(ts / 1000),
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
        let ts = Date.now();
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
              timestamp: Math.floor(ts / 1000),
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
    });
  }

  if (message.text === "!out") {
    let params = {
      TableName: tableName,
      KeyConditionExpression: "PK = :PK and SK = :SK",
      ExpressionAttributeValues: {
        ":PK": message.user,
        ":SK": "status",
      },
    };

    docClient.query(params, (err, data) => {
      if (err) {
        // console.error(` select 실패${err}`);
        return;
      }

      if (data.Items.length === 0) {
        plainTextSend("등록되지 않은 유저입니다");
      } else {
        //공부중이었던 유저
        if (data.Items[0].status === 1) {
          let ts = Date.now();

          let studyTime = Math.floor(ts / 1000) - data.Items[0].timestamp; //second

          let params = {
            TableName: tableName,
            Item: {
              PK: message.user,
              SK: "status",
              status: 0,
              timestamp: Math.floor(ts / 1000),
            },
          };
          docClient.put(params, (err, data) => {
            if (err) {
              plainTextSend("에러");
              return;
            }
            studyTimeSend(`공부를 종료했습니다.`, secondToHHMMSS(studyTime));
            //여기서 저장도 해야되긴하는데, 아직 구현 x
            // - PK 는 id 그대로
            // - SK 는 현재 년월일 구한후 YYYY-MM-DD
            // - studyTime 컬럼에 아까 출력했던 시간을 초로 저장
            // - 만약 위 데이터가 있는경우, studyTime을 추가로 + 해서 업데이트하는식으로
          });
        }
        if (data.Items[0].status === 0) {
          plainTextSend("공부를 종료한 유저입니다");
        }
      }
    });
  }

  if (message.text === "!help") {
    plainTextSend(`
  도움말
  \`!in\` 공부시작
  \`!out\` 공부종료
  \`!status\` 현재상태
      `);
  }

  if (message.text === "!status") {
    let params = {
      TableName: tableName,
      KeyConditionExpression: "PK = :PK and SK = :SK",
      ExpressionAttributeValues: {
        ":PK": message.user,
        ":SK": "status",
      },
    };

    docClient.query(params, (err, data) => {
      if (err) {
        // console.error(` select 실패${err}`);
        return;
      }

      if (data.Items.length === 0) {
        plainTextSend("등록되지 않은 유저입니다");
      } else {
        //공부중이었던 유저
        if (data.Items[0].status === 1) {
          let ts = Date.now();

          let studyTime = Math.floor(ts / 1000) - data.Items[0].timestamp; //second

          studyTimeSend(`공부중입니다.`, secondToHHMMSS(studyTime));
          //여기서 저장도 해야되긴하는데, 아직 구현 x
          // - PK 는 id 그대로
          // - SK 는 현재 년월일 구한후 YYYY-MM-DD
          // - studyTime 컬럼에 아까 출력했던 시간을 초로 저장
          // - 만약 위 데이터가 있는경우, studyTime을 추가로 + 해서 업데이트하는식으로
        }
        if (data.Items[0].status === 0) {
          plainTextSend("공부를 종료한 유저입니다");
        }
      }
    });
  }

  if (message.text === "!test") {
    studyTimeSend("테스트", 1);
  }
});
