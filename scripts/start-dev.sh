#!/bin/bash
    cd AppServe && npm install && npm start &
    cd ../AppTools && npm install && npm run dev
