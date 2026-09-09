 = New-Object -ComObject WScript.Shell  
 = .CreateShortcut('C:\Users\icell\OneDrive\Desktop\CloudMix Pro.lnk')  
.TargetPath = 'C:\Users\icell\AppData\Local\Programs\CloudMix Pro\CloudMix Pro.exe'  
.WorkingDirectory = 'C:\Users\icell\AppData\Local\Programs\CloudMix Pro'  
.Save()  
