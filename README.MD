# Platogo Coding Challenge Backend

## Description

This is the backend for the Platogo Coding Challenge.

The frontend can be found within the [`platogo-coding-challange`][1] repo.

[1]: https://github.com/gernotpokorny/regionalmedien-coding-challenge

## Compile and start during development

## With debugger

### Via Docker (preferred)

1. Run `npm run build`
2. Run and Debug > Docker Node.js Launch

### Without Docker

1. Run `npm run build`
2. Run and Debug > Launch via NPM

## Without debugger

### Via Docker

1. Run `docker build .`
2. Run `docker run -p 3001:3001 <image-id>`

### Without Docker

1. Run `npm run build`
2. Run `npm start`

## Run the tests

1. Run `npm run test`