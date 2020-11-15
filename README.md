# 공부시간 체크 봇

간단한 명령어로 공부시간을 체크할수있는 slack bot 입니다.

_커먼스페이스_ 라는 출퇴근 관리 솔루션을 참고했으며,

Slack API, Node.JS, AWS EC2, DynamoDB, PM2 를 사용했습니다.

Slack API의 user ID 를 받아서 사용하기때문에 유저별로 시간 적용이 가능합니다.

메시지는 해당 채널에 전체 메시지로 게시됩니다

## 사용가능 명령어

1. `!help` 명령어보기
1. `!in` 공부시작
1. `!out` 공부종료
1. `!stop` 자리비움
1. `!status` 현재상태

## 유튜브

[https://youtu.be/ibfu2VlQAds](https://youtu.be/ibfu2VlQAds)

## 실행 이미지

<img src="https://user-images.githubusercontent.com/59547369/99194067-914ed980-27c0-11eb-8941-edee42e0f324.png" width="500">

## config 관련

config/slack.js 생성해야합니다

```
token = "봇 토큰"
botName = "봇 이름"
channelName = "메시지를 게시할 채널명"
icon_emoji = "봇 아이콘"
```

aws_config.json은 로컬 테스트에서 사용했고

EC2에 올린뒤로는 EC2 Role 을 이용하기때문에 생략했습니다
