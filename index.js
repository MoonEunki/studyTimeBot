const Slack = require("slack-node");
const RtmPkg = require("@slack/rtm-api");
const AWS = require("aws-sdk");

AWS.config.update({
  region: "ap-northeast-2",
});

const docClient = new AWS.DynamoDB.DocumentClient();

const table = "slackTimeBot"; //DDB table name
const token = process.env.SLACK_TOKEN || "slack token";

const { RTMClient } = RtmPkg;
const slack = new Slack(token);

const plainTextSend = async (message) => {
  slack.api(
    "chat.postMessage",
    {
      username: "시간체크봇", // 슬랙에 표시될 봇이름
      channel: "b-개발", // 메시지가 전송될 채널
      icon_emoji: ":sad_pepe:",
      text: message,
    },
    function (err, response) {
      //   console.log(response, err); // 보낼 때마다 내용을 확인하고 싶은 경우 주석해제
    }
  );
};

const send = async (message, time) => {
  slack.api(
    "chat.postMessage",
    {
      username: "시간체크봇",
      channel: "b-개발",
      icon_emoji: ":sad_pepe:",

      text: message,

      //이거때문에 개뻘짓함,,. stringify 해줘야 작동함
      attachments: JSON.stringify([
        {
          color: "#36a64f",
          text: `공부시간 \`${time}\` `,
        },
      ]),
    },
    function (err, response) {
      // console.log(response)
    }
  );
};

const HHMMSS = (second) => {
  let sec_num = parseInt(second, 10); // don't forget the second param
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

const rtm = new RTMClient(token);
rtm.start();

rtm.on("message", (message) => {
  if (message.text === "in") {
    let params = {
      TableName: table,
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
          TableName: table,
          Item: {
            PK: message.user,
            SK: "status",
            status: 1,
            timestamp: Math.floor(ts / 1000),
          },
        };
        docClient.put(params, function (err, data) {
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
            TableName: table,
            Item: {
              PK: message.user,
              SK: "status",
              status: 1,
              timestamp: Math.floor(ts / 1000),
            },
          };
          docClient.put(params, function (err, data) {
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

  if (message.text === "out") {
    let params = {
      TableName: table,
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
            TableName: table,
            Item: {
              PK: message.user,
              SK: "status",
              status: 0,
              timestamp: Math.floor(ts / 1000),
            },
          };
          docClient.put(params, function (err, data) {
            if (err) {
              plainTextSend("에러");
              return;
            }
            send(`공부를 종료했습니다.`, HHMMSS(studyTime));
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

  if (message.text === "help") {
    plainTextSend(`
도움말
\`in\` 공부시작
\`out\` 공부종료
\`status\` 현재상태
    `);
  }

  if (message.text === "status") {
    let params = {
      TableName: table,
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

          send(`공부중입니다.`, HHMMSS(studyTime));
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
  if (message.text === "test") {
    send("테스트", 1);
  }
});
