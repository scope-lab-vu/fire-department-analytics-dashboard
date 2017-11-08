FROM ubuntu:14.04
RUN apt-get update -y
RUN apt-get install -y python-pip python-dev build-essential
COPY . /app
WORKDIR /app
RUN pip install --upgrade pip
RUN apt-get install libatlas-base-dev gfortran -y
RUN pip install --upgrade six==1.9.0
RUN pip install -r requirements.txt
ENTRYPOINT ["python"]
CMD ["run.py"]