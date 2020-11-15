import aws from "aws-sdk";
const { config, DynamoDB } = aws;
config.loadFromPath("./config/aws_config.json");
const docClient = new DynamoDB.DocumentClient();
import { sendMessage, simpleMessage, secondToHHmmss } from "./utils.js";

const tableName = "slackTimeBot";

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
        reject(err);
        return;
      }
      resolve(data);
    });
  });
};

const startStudy = (userId, time) => {
  const params = {
    TableName: tableName,
    Item: {
      PK: userId,
      SK: "status",
      status: 1,
      timeStamp: Math.floor(time),
      stopTime: 0,
      stopTimeCalc: 0,
    },
  };
  docClient.put(params, (err, data) => {
    if (err) {
      sendMessage(simpleMessage("에러"));
      return;
    }
    sendMessage(simpleMessage(`:computer: 공부를 시작했습니다`));
  });
};

const endStudy = (userId, studyTime, stopTimeCalc) => {
  const params = {
    TableName: tableName,
    Key: {
      PK: userId,
      SK: "status",
    },
    UpdateExpression:
      "set #stat = :stat,stopTime=:stopTime, stopTimeCalc=:timecalc",
    ExpressionAttributeValues: {
      ":stat": 0,
      ":timecalc": 0,
      ":stopTime": 0,
    },
    ExpressionAttributeNames: {
      "#stat": "status",
    },
    ReturnValues: "UPDATED_NEW",
  };

  docClient.update(params, function (err, data) {
    if (err) {
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data));
      sendMessage(
        simpleMessage(`공부를 종료했습니다.
      *순 공부시간*: ${secondToHHmmss(studyTime)}
      *자리비움 시간*: ${secondToHHmmss(stopTimeCalc)}`) //메시지 형식 바꿀필요있음
      );
    }
  });
};

const stopStudy = (userId, time) => {
  const params = {
    TableName: tableName,
    Key: {
      PK: userId,
      SK: "status",
    },
    UpdateExpression: "set #stat = :stat,stopTime=:stopTime",
    ExpressionAttributeValues: {
      ":stat": 2,
      ":stopTime": time,
    },
    ExpressionAttributeNames: {
      "#stat": "status",
    },
    ReturnValues: "UPDATED_NEW",
  };

  docClient.update(params, (err, data) => {
    if (err) {
      sendMessage(simpleMessage(err + "에러"));
      return;
    }
    sendMessage(
      simpleMessage(
        ":hourglass_flowing_sand: `자리비움중` 입니다 (다시 시작 `!in`)"
      )
    );
  });
};

const restartStudy = (userId, stopTimeCalc) => {
  const params = {
    TableName: tableName,
    Key: {
      PK: userId,
      SK: "status",
    },
    UpdateExpression: "set #stat = :stat, stopTimeCalc=:timecalc",
    ExpressionAttributeValues: {
      ":stat": 1,
      ":timecalc": stopTimeCalc,
    },
    ExpressionAttributeNames: {
      "#stat": "status",
    },
    ReturnValues: "UPDATED_NEW",
  };

  docClient.update(params, function (err, data) {
    if (err) {
      // console.error(
      //   "Unable to update item. Error JSON:",
      //   JSON.stringify(err, null, 2)
      // );
    } else {
      console.log("UpdateItem succeeded:", JSON.stringify(data));
      sendMessage(
        simpleMessage(
          ":computer:`공부중`입니다 (자리비움:`/stop`,공부종료:`/out`)"
        )
      ); //공부시간,자리비움시간도 표시하게 하기?
    }
  });
};

// put -> 새로 생성된 유저가 공부시작
// update -> params 를 받아서 update하는 방식으로, 성공하면 return해주고, return 받아서 메시지 띄우기
// query -> 결과 뽑을때, 자주사용

export { getUserData, startStudy, restartStudy, endStudy, stopStudy };
