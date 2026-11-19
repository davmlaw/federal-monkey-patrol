# Microsoft Developer Studio Project File - Name="kong" - Package Owner=<4>
# Microsoft Developer Studio Generated Build File, Format Version 6.00
# ** DO NOT EDIT **

# TARGTYPE "Win32 (x86) Application" 0x0101

CFG=kong - Win32 Debug
!MESSAGE This is not a valid makefile. To build this project using NMAKE,
!MESSAGE use the Export Makefile command and run
!MESSAGE 
!MESSAGE NMAKE /f "kong.mak".
!MESSAGE 
!MESSAGE You can specify a configuration when running NMAKE
!MESSAGE by defining the macro CFG on the command line. For example:
!MESSAGE 
!MESSAGE NMAKE /f "kong.mak" CFG="kong - Win32 Debug"
!MESSAGE 
!MESSAGE Possible choices for configuration are:
!MESSAGE 
!MESSAGE "kong - Win32 Release" (based on "Win32 (x86) Application")
!MESSAGE "kong - Win32 Debug" (based on "Win32 (x86) Application")
!MESSAGE 

# Begin Project
# PROP AllowPerConfigDependencies 0
# PROP Scc_ProjName ""
# PROP Scc_LocalPath ""
CPP=cl.exe
MTL=midl.exe
RSC=rc.exe

!IF  "$(CFG)" == "kong - Win32 Release"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 0
# PROP BASE Output_Dir "Release"
# PROP BASE Intermediate_Dir "Release"
# PROP BASE Target_Dir ""
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 0
# PROP Output_Dir "Release"
# PROP Intermediate_Dir "Release"
# PROP Ignore_Export_Lib 0
# PROP Target_Dir ""
# ADD BASE CPP /nologo /W3 /GX /O2 /D "WIN32" /D "NDEBUG" /D "_WINDOWS" /D "_MBCS" /YX /FD /c
# ADD CPP /nologo /MD /W2 /GX /O2 /I "../include" /D "WIN32" /D "NDEBUG" /D "_WINDOWS" /D "_MBCS" /YX /FD /c
# ADD BASE MTL /nologo /D "NDEBUG" /mktyplib203 /win32
# ADD MTL /nologo /D "NDEBUG" /mktyplib203 /win32
# ADD BASE RSC /l 0x409 /d "NDEBUG"
# ADD RSC /l 0x409 /i "include" /d "NDEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib odbc32.lib odbccp32.lib /nologo /subsystem:windows /machine:I386
# ADD LINK32 sdl.lib sdlmain.lib sdl_image.lib fmodvc.lib OpenGL32.lib GLu32.lib GLaux.lib kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib odbc32.lib odbccp32.lib /nologo /subsystem:windows /machine:I386 /libpath:"../lib"
# SUBTRACT LINK32 /pdb:none /nodefaultlib

!ELSEIF  "$(CFG)" == "kong - Win32 Debug"

# PROP BASE Use_MFC 0
# PROP BASE Use_Debug_Libraries 1
# PROP BASE Output_Dir "Debug"
# PROP BASE Intermediate_Dir "Debug"
# PROP BASE Target_Dir ""
# PROP Use_MFC 0
# PROP Use_Debug_Libraries 1
# PROP Output_Dir "Debug"
# PROP Intermediate_Dir "Debug"
# PROP Ignore_Export_Lib 0
# PROP Target_Dir ""
# ADD BASE CPP /nologo /W3 /Gm /GX /ZI /Od /D "WIN32" /D "_DEBUG" /D "_WINDOWS" /D "_MBCS" /YX /FD /GZ /c
# ADD CPP /nologo /MDd /W3 /Gm /GX /ZI /Od /I "../include" /D "WIN32" /D "_DEBUG" /D "_WINDOWS" /D "_MBCS" /FR /YX /FD /GZ /c
# ADD BASE MTL /nologo /D "_DEBUG" /mktyplib203 /win32
# ADD MTL /nologo /D "_DEBUG" /mktyplib203 /win32
# ADD BASE RSC /l 0x409 /d "_DEBUG"
# ADD RSC /l 0x409 /i "include" /d "_DEBUG"
BSC32=bscmake.exe
# ADD BASE BSC32 /nologo
# ADD BSC32 /nologo
LINK32=link.exe
# ADD BASE LINK32 kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib odbc32.lib odbccp32.lib /nologo /subsystem:windows /debug /machine:I386 /pdbtype:sept
# ADD LINK32 SDL.lib SDLmain.lib SDL_image.lib fmodvc.lib OpenGL32.lib GLu32.lib GLaux.lib kernel32.lib user32.lib gdi32.lib winspool.lib comdlg32.lib advapi32.lib shell32.lib ole32.lib oleaut32.lib uuid.lib odbc32.lib odbccp32.lib /nologo /subsystem:windows /incremental:no /debug /machine:I386 /pdbtype:sept /libpath:"..\lib"
# SUBTRACT LINK32 /verbose

!ENDIF 

# Begin Target

# Name "kong - Win32 Release"
# Name "kong - Win32 Debug"
# Begin Group "Source Files"

# PROP Default_Filter "cpp;c;cxx;rc;def;r;odl;idl;hpj;bat"
# Begin Source File

SOURCE=..\billboards.cpp
# End Source File
# Begin Source File

SOURCE=..\building.cpp
# End Source File
# Begin Source File

SOURCE=..\camera.cpp
# End Source File
# Begin Source File

SOURCE=..\city_generator.cpp
# End Source File
# Begin Source File

SOURCE=..\crosstree.cpp
# End Source File
# Begin Source File

SOURCE=..\display.cpp
# End Source File
# Begin Source File

SOURCE=..\drawable.cpp
# End Source File
# Begin Source File

SOURCE=..\frustum.cpp
# End Source File
# Begin Source File

SOURCE=..\game.cpp
# End Source File
# Begin Source File

SOURCE=..\gfx.cpp
# End Source File
# Begin Source File

SOURCE=..\gltext.cpp
# End Source File
# Begin Source File

SOURCE=..\input.cpp
# End Source File
# Begin Source File

SOURCE=..\loadbar.cpp
# End Source File
# Begin Source File

SOURCE=..\main.cpp
# End Source File
# Begin Source File

SOURCE=..\mission.cpp
# End Source File
# Begin Source File

SOURCE=..\model.cpp
# End Source File
# Begin Source File

SOURCE=..\model_md2.cpp
# End Source File
# Begin Source File

SOURCE=..\model_obj.cpp
# End Source File
# Begin Source File

SOURCE=..\mtxlib.cpp
# End Source File
# Begin Source File

SOURCE=..\patchgrid.cpp
# End Source File
# Begin Source File

SOURCE=..\picture.cpp
# End Source File
# Begin Source File

SOURCE=..\quadtree.cpp
# End Source File
# Begin Source File

SOURCE=..\skyscraper.cpp
# End Source File
# Begin Source File

SOURCE=..\storyteller.cpp
# End Source File
# Begin Source File

SOURCE=..\textfile_reader.cpp
# End Source File
# Begin Source File

SOURCE=..\texture.cpp
# End Source File
# Begin Source File

SOURCE=..\timer.cpp
# End Source File
# Begin Source File

SOURCE=..\transition.cpp
# End Source File
# Begin Source File

SOURCE=..\util.cpp
# End Source File
# Begin Source File

SOURCE=..\world.cpp
# End Source File
# End Group
# Begin Group "Header Files"

# PROP Default_Filter "h;hpp;hxx;hm;inl"
# Begin Source File

SOURCE=..\billboards.h
# End Source File
# Begin Source File

SOURCE=..\building.h
# End Source File
# Begin Source File

SOURCE=..\camera.h
# End Source File
# Begin Source File

SOURCE=..\city_generator.h
# End Source File
# Begin Source File

SOURCE=..\crosstree.h
# End Source File
# Begin Source File

SOURCE=..\display.h
# End Source File
# Begin Source File

SOURCE=..\drawable.h
# End Source File
# Begin Source File

SOURCE=..\frustum.h
# End Source File
# Begin Source File

SOURCE=..\game.h
# End Source File
# Begin Source File

SOURCE=..\gfx.h
# End Source File
# Begin Source File

SOURCE=..\gltext.h
# End Source File
# Begin Source File

SOURCE=..\graphics.h
# End Source File
# Begin Source File

SOURCE=..\input.h
# End Source File
# Begin Source File

SOURCE=..\kong.h
# End Source File
# Begin Source File

SOURCE=..\loadbar.h
# End Source File
# Begin Source File

SOURCE=..\mission.h
# End Source File
# Begin Source File

SOURCE=..\model.h
# End Source File
# Begin Source File

SOURCE=..\model_md2.h
# End Source File
# Begin Source File

SOURCE=..\model_obj.h
# End Source File
# Begin Source File

SOURCE=..\mtxlib.h
# End Source File
# Begin Source File

SOURCE=..\patchgrid.h
# End Source File
# Begin Source File

SOURCE=..\picture.h
# End Source File
# Begin Source File

SOURCE=..\quadtree.h
# End Source File
# Begin Source File

SOURCE=..\skyscraper.h
# End Source File
# Begin Source File

SOURCE=..\storyteller.h
# End Source File
# Begin Source File

SOURCE=..\textfile_reader.h
# End Source File
# Begin Source File

SOURCE=..\texture.h
# End Source File
# Begin Source File

SOURCE=..\timer.h
# End Source File
# Begin Source File

SOURCE=..\transition.h
# End Source File
# Begin Source File

SOURCE=..\util.h
# End Source File
# Begin Source File

SOURCE=..\world.h
# End Source File
# End Group
# Begin Group "Resource Files"

# PROP Default_Filter "ico;cur;bmp;dlg;rc2;rct;bin;rgs;gif;jpg;jpeg;jpe"
# End Group
# End Target
# End Project
