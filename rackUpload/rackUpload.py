import torndb as database
import json
import logging
import ast
import datetime
import time
import os, random, string
import re
import cx_Oracle
import codecs
from os import listdir
from os.path import isfile, join
import smtplib


dsn_tns = cx_Oracle.makedsn('localhost', 1521, 'star')
con = cx_Oracle.connect('reader', 'reader', dsn_tns)
cur = con.cursor()

db = database.Connection('127.0.0.1',
                         'vialdb',
                         user='writer',
                         password='writer')
sUploadDir = "/home/mats.dahlberg/venv/verify_dev/uploads/"
sHomerDir = "/home/mats.dahlberg/homer/scannedRacks/"


FROM = 'rack-scanner@scilifelab.se'
#TO = ["asa.slevin@ki.se"] # must be a list
TO = ["mats.dahlberg@scilifelab.se"] # must be a list
SUBJECT = "Scanned racks"



def parseFile(sFile):
    sTime = time.strftime("%Y-%m-%d %H:%M")
    if sFile == "dummy":
        return ""
    sSlask = sHomerDir + "dummy"
    try:
        os.unlink(sSlask)
    except:
        pass
    try:
        with open(sSlask, 'a'):
            os.chmod(sSlask, 0o777)
            os.utime(sSlask, None)
    except Exception, e:
        #print str(e)
        pass
    with open(sHomerDir + sFile, 'r') as myfile:
        sData=myfile.read()

    m = re.search("Rack Base Name: (\w\w\d+)", sData)
    if m:
        sRackId = m.groups()[0]
    else:
        logging.error(sTime + " Error cant find rack-id in file")
        return ""

    original_fname = sFile
    extension = os.path.splitext(original_fname)[1]
    fname = ''.join(random.choice(string.ascii_lowercase + string.digits) for x in range(6))
    finalFilename = sUploadDir + fname + '_' + original_fname
    output_file = open(finalFilename, 'w')
    output_file.write(sData)
    output_file.close()

    fNewFile = open(finalFilename, mode='rU')
    saFile = fNewFile.readlines()
    iOk = 0
    iError = 0
    saError = []
    for sLine in saFile:
        m = re.search("  (\w\d\d);\t(\d+)", sLine)
        if m:
            sPosition = m.groups()[0]
            sTube = m.groups()[1]
        else:
            continue
        sSql = """select matrix_id from microtube.matrix where matrix_id = '%s'""" % sRackId
        sSlask = cur.execute(sSql)
        tRes = cur.fetchall()
        if len(tRes) < 1:
            logging.error(sTime + " Rack not found " + sRackId + ' File: ' + sFile)
            return "\n\nRack not found: " + sRackId + " file skipped: " + sFile

        sSql = """select matrix_id from microtube.matrix_tube
        where tube_id = '%s'
        """ % sTube
        sSlask = cur.execute(sSql)
        tRes = cur.fetchall()
        if len(tRes) < 1:
            iError += 1
            saError.append(sTube)
            logging.info(sTime + " tube_id " + sTube + ' does not exists')
            continue
        sSql = """update microtube.matrix_tube set position = '%s', matrix_id = '%s'
                  where tube_id = '%s'
               """ % (sPosition, sRackId, sTube)
        cur.execute(sSql)
        con.commit()
        iOk += 1
    os.unlink(sHomerDir + sFile)
    logging.error(sTime + " Rack Id: " + sRackId + " Tubes not found in db: " + str(saError))
    return "Rack Id: " + sRackId + " Tubes not found in db: " + str(saError) + '\n\n'


def readDirectory(sPath):
    saFiles = [f for f in listdir(sPath) if isfile(join(sPath, f))]
    return saFiles


saFiles = readDirectory(sHomerDir)


sMessage = ""
for sFile in saFiles:
    sMessage += str(parseFile(sFile))

if sMessage != "":
    sBody = """\
From: %s
To: %s
Subject: %s

%s
""" % (FROM, ", ".join(TO), SUBJECT, sMessage)
    server = smtplib.SMTP('smtp.ki.se')
    server.sendmail(FROM, TO, sBody)
    server.quit()

if os.path.isdir(sHomerDir) != True:
    server = smtplib.SMTP('smtp.ki.se')
    server.sendmail(FROM, TO, 'Homer not mounted')
    server.quit()


