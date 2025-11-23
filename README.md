# sleepi
hack western 2025

How to run the webapp on phone:
1. connect to eduroam

2. set up the client
```
# Run this in your frontend terminal
npm run dev -- --host
```
take your eduroam ip and put it in /client/sleepi/.env
ie:
VITE_API_URL=123.12.12.12:8000

3. set up the server
```
# Run this in your backend terminal
uvicorn main:app --host {IP ADDRESS} --port 8000 --reload
```
make sure to take the ip address of your frontend and substitute into the command

4. try it on phone
