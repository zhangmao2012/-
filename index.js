const express = require("express");
const app = express();
app.use(express.static("www"));
const server = app.listen(3000,function(){
    console.log("服务器启动成功");
});


// 请求 WebSocket 模块
const WebSocket = require("ws")
// 创建 WebSocket 服务对象
const websocket = new WebSocket.Server({
    server: server
})

// 定义一个数组保存所有链接到服务器的用户
let userList = [];

// 监听客户端程序链接事件
// connection：当有新用户链接到服务器websocket时触发这个监听
// 回调函数参数：ws表示客户端的websocket对象，req表示请求对象
websocket.on("connection",(ws,req)=>{
    // console.log(req.connection.remoteAddress);
    let ip = req.connection.remoteAddress
    ws.ip = ip
    // console.log(req.url);
    let nickname = decodeURI(req.url.substring(1))
    ws.nickname = nickname

    if (userList.length === 0) {
        ws.vip = true
    }else{
        ws.vip = false
    }

    // 通知除自己外的其他人：谁进入了聊天室
    userList.forEach(item=>{
        let data = {
            type: "in-out",
            nickname: nickname,
            content: "进入聊天室"
        }
        item.send(JSON.stringify(data))
    })
    
    // 把自己也加入到列表
    userList.push(ws)

    // 通知所有人目前聊天室在线人数
    userList.forEach(item => {
        let data = {
            type: "welcome",
            content: "欢迎来到202006聊天室，目前在线人数：" + userList.length + "人"
        }
        item.send(JSON.stringify(data))
    })

    // 监听客服端发过来的消息
    ws.on("message",data=>{
        let dataObj = JSON.parse(data);
        // 防止跨网站攻击
        if (dataObj.data) {
            dataObj.data = dataObj.data.replace(/</g, "&lt;")
            dataObj.data = dataObj.data.replace(/>/g, "&gt;")
        }
        switch (dataObj.type) {
            case "group":
                userList.forEach(item => {
                    let data = {
                        type: "group",
                        content: dataObj.data,
                        nickname: ws.nickname,
                        ip: ws.ip,
                        vip: item.vip
                    }
                    item.send(JSON.stringify(data))
                })
                break;
            case "private":
                let user = userList.find(item => item.nickname === dataObj.target)
                if (user) {
                    // 私聊的目标
                    let data1 = {
                        type: "private",
                        content: dataObj.data,
                        nickname: ws.nickname,
                        ip: ws.ip
                    }
                    user.send(JSON.stringify(data1))

                    // 我自己
                    let data2 = {
                        type: "private-success",
                        content: dataObj.data,
                        nickname: dataObj.target,
                        ip: ws.ip
                    }
                    ws.send(JSON.stringify(data2))
                }else{}
                break;
                case "tichu":
                    let index = userList.findIndex(item => item.nickname === dataObj.nickname)
                    userList.forEach(item => {
                        let data = {
                            type: "in-out",
                            nickname: userList[index].nickname,
                            content: "被踢出聊天室"
                        }
                        item.send(JSON.stringify(data))
                    })
                    if (index >= 0) {
                        userList[index].close()
                        userList.splice(index, 1)
                    }
                break;
            default:
                break;
        }
    })  

    // 关闭链接
    ws.on("close",()=>{
        let index = userList.indexOf(ws)
        if (index >= 0) {
            userList.splice(index,1)
        }
        userList.forEach(item => {
            let data = {
                type: "in-out",
                nickname: nickname,
                content: "退出聊天室"
            }
            item.send(JSON.stringify(data))
        })
    })
})


// XSS：HTML是一种超文本标记语言，通过将一些字符特殊地对待来区别文本和标记，例如，小于符号（<）被看作是HTML标签的开始，<title>与</title>之间的字符是页面的标题等等。当动态页面中插入的内容含有这些特殊字符（如<）时，用户浏览器会将其误认为是插入了HTML标签，当这些HTML标签引入了一段JavaScript脚本时，这些脚本程序就将会在用户浏览器中执行。所以，当这些特殊字符不能被动态页面检查或检查出现失误时，就将会产生XSS漏洞。