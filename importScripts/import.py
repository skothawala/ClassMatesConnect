import openpyxl
from string import ascii_uppercase
import urllib

wb = openpyxl.load_workbook('Course Enrollments.Fall 2015.10282015.xlsx')
sheet = wb.get_sheet_by_name('Sheet1')
#for row in range(2, sheet.get_highest_row() + 1):
i = 2000
for row in range(2000, sheet.get_highest_row() + 1):
    params = urllib.urlencode({
        "subject" : sheet['A' + str(row)].value,
        "career":sheet['B' + str(row)].value,
        "catalog_number":sheet['I' + str(row)].value,
        "section_number":sheet['J' + str(row)].value,
        "course_title":sheet['L' + str(row)].value,
        "intstructor":sheet['M' + str(row)].value ,
        "intstructor_email":sheet['N' + str(row)].value,
        "campus":sheet['X' + str(row)].value,
        "building":sheet['Z' + str(row)].value,
        "room_number":sheet['AA' + str(row)].value,
        "meeting_patern":sheet['AC' + str(row)].value,
        "start_time":sheet['AD' + str(row)].value,
        "end_time":sheet['AE' + str(row)].value
    })
    
    f = urllib.urlopen("https://classmatesconnect-skothawala.c9users.io:8080/api/courses/add", params)
    print f.read()
    print i
    i += 1
    
    