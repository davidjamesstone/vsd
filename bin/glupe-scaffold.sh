#!/bin/bash 

if [ $1 = 'api' ]
then
  git clone -b api https://github.com/davidjamesstone/glupe-base.git $2
elif [ $1 = 'gov' ]
then
  git clone -b gov https://github.com/davidjamesstone/glupe-base.git $2
elif [ $1 = 'vsd-web' ]
then
  git clone -b vsd-web https://github.com/davidjamesstone/glupe-base.git $2
else
  git clone https://github.com/davidjamesstone/glupe-base.git $2
fi

cd $2
rm -rf .git

perl -pi -e s,glupe-base,$2,g package.json
perl -pi -e s,glupe-base,$2,g readme.md
perl -pi -e s,glupe-base,$2,g config/pm2.json

cp config/server.example.json config/server.json

npm i

if [ $1 = 'gov' ]
then
  npm run build
fi

git init
