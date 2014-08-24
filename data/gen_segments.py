#!/usr/bin/python

import sys
import os
import imma
from numpy import array

def writeBinArray(arry, filename):
  if not os.path.exists(os.path.dirname(filename)):
    os.makedirs(os.path.dirname(filename))
  fout = open(filename, 'wb')
  bin_array = array(arry, 'float32')
  bin_array.tofile(fout)
  fout.close()

## ship entries per file ('segment')
SEGMENT_LEN = 10000

if len(sys.argv) < 3:
  print 'Must supply input and output directories'
  sys.exit()

files = []

## build a date-ordered list of all of the files to process
for filename in os.listdir(sys.argv[1]):
  files.append(sys.argv[1] + '/' + filename)

files.sort()
fin_cnt = 0 # file counter
entry_cnt = 0 # ship entries (written) counter
seg_cnt = 0 # segment (out file) counter

coords = []

for filename in files:
  with open(filename) as infile:
    for line in infile:
      entry = imma.parseLine(line)

      lat = entry['lat']
      lng = entry['lng']

      ## skip if poor coords
      if lat == -1 or lng == -1:
        continue

      if lat % 10 == 0 and lng % 10 == 0:
        continue

      ## skip if not a ship
      pt = entry['pt']
      #if pt < 1 or pt > 5:
      #if pt < 1:
      #  continue

      ## skip if poor coordinate precision
      # li = entry['li']
      # if li < 1:
      #   continue;

      ## write the current segment and start buildign the next
      if entry_cnt % SEGMENT_LEN == 0:
        if entry_cnt != 0:
          writeBinArray(coords, sys.argv[2] + '/coords' + str(seg_cnt - 1) + '.bin')
          coords = []

        seg_cnt += 1

      entry_cnt += 1

      coords.append(lng)
      coords.append(lat)
      coords.append(pt)

  infile.close()

  sys.stdout.write('%3.0f%%\r' % (fin_cnt * 100 / len(files)))
  sys.stdout.flush()
  fin_cnt += 1

filename = sys.argv[2] + '/segs.idx'
with open(filename, 'w') as fout:
  print >>fout, seg_cnt
fout.close()

sys.stdout.write('\n\a')
