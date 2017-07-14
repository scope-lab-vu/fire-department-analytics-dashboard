from myapp import scheduler
scheduler.start()

from myapp import app
app.run(host='0.0.0.0')

# uwsgi --http :8888 --module wsgi  --callable app
# https://www.digitalocean.com/community/tutorials/how-to-serve-flask-applications-with-uwsgi-and-nginx-on-ubuntu-14-04
# virtualenv venv --python=/usr/local/lib/python2.7.10/bin/python