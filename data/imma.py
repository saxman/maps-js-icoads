import sys

def parseLine(line):
  vals = dict()

  ## PT: Platform Type
  ## 0 unknown
  ## 1-5 are ships
  ## some values ''
  pt = line[124:126].strip()
  if pt == '':
    pt = -1
  else:
    try:
      pt = int(pt)
    except ValueError:
      sys.stderr.write(line)

  vals['pt'] = pt

  ## LI: Lat/lng Indicator (precision)
  ## 0 = degrees and tenths
  ## 4 = degrees and minutes
  ## some values ''
  li = line[27:28].strip()
  if li == '':
    li = -1
  else:
    try:
      li = int(li)
    except ValueError:
      sys.stderr.write(line)

  vals['li'] = li

  ## id identifier
  ## Values undefined (9 & 10 present)
  # ii = line[32:34].strip()
  # if ii == '' or int(ii) != 10:
  #   continue

  ## lat, lng
  y = line[12:17].strip()
  x = line[17:23].strip()

  if y == '-':
    y = ''

  lat = lng = -1
  if x != '' and y != '':
    try:
      lng = int(x) / 100.
    except ValueError:
      sys.stderr.write(line)
    try:
      lat = int(y) / 100.
    except ValueError:
      sys.stderr.write(line)

  vals['lat'] = lat
  vals['lng'] = lng

  ## Add spatial jitter
  # if int(li) == 0:
  #   lat += random.random() - .5
  #   lng += random.random() - .5

  year = line[0:4]
  vals['year'] = year

  month = line[4:6]
  vals['month'] = month

  day = line[6:8]
  vals['day'] = day

  return vals

