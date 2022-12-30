# Webspace Engine

This is the engine for [Webspaces](https://webspaces.space), which allows you to create 3D worlds using just HTML.

## Notice

If you want to get started with **webspaces.space** instead of the engine it works on, please go to [webpsace-sdk](https://github.com/webspace-sdk/webspace-sdk.github.io)

## Getting started

Clone the repo and run:

```
npm ci
npm run local
```

Then, to create a new webspace, save this to a new HTML file in a new folder:
```
<html>
<head><script src="http://localhost:8080/assets/js/index.js"></script></head>
<body></body>
</html>
```

And open it up in chrome via File->Open. You will then be able to edit the HTML file as a 3D world.

## Alternative Starting Point

You can use the publicly available webspace base in your websites too! You can do this by inserting this line into your html script:

```
<script src="https://webspace.run"
```

An example html document with this method is:
```
<html>
<head>
<script src="https://webspace.run"></script>
<title>Webspaces are Cool</title>
</head>
<body></body>
</html>
```
