# Hackernews Grid

This repo has two parts. 
One part is to get the screenshots every hour and saving the results to the disk.
Another part is just a static site presenting this.

## Setup
```
npm i
```

## Get screenshots
```
./sync
```

## Show me
```
cd public

python3 -m http.server
# OR
python2 -m SimpleHTTPServer
# OR
php -S 0.0.0.0:8000
# OR
ruby -run -e httpd
```
