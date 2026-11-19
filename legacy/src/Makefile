BINARY	= ../kongtest
CC	= g++
ALLFLAGS = -Wall -O2
DEBUGFLAGS = -g -pg
INCLUDE = .
CFLAGS	= -I$(INCLUDE) `sdl-config --cflags` `xml2-config --cflags`
X11LIB  = /usr/X11R6/lib
SDLLIBS = `sdl-config --libs` -lSDL_image -lSDL_mixer
XMLLIBS = `xml2-config --libs`
LIBS	= -L$(X11LIB) -lGL -lGLU -lm $(SDLLIBS) $(XMLLIBS)
ROOTDIR	= .
BUILD	= .
OBJECTS = main.o testing.o
SUBDIRS = util sound input game graphics

all:	$(BINARY) $(SUBDIRS)

clean:
	$(foreach obj, $(OBJECTS), rm -f $(BUILD)/$(obj) $(obj:.o=.d))
	for dir in $(SUBDIRS); do \
	  make -C $$dir clean; \
	done

.PHONY:	$(SUBDIRS)
$(SUBDIRS):
	make -C $@

$(BINARY):	$(OBJECTS) $(SUBDIRS)
	$(CC) *.o util/*.o \
	game/*.o game/blank/*.o game/picture/*.o game/soundtrack/*.o \
	game/storyteller/*.o game/transition/*.o \
	game/tuner/*.o game/tuner/toggle/*.o game/tuner/menu/*.o \
	game/mission/*.o game/mission/world/*.o game/mission/outcomes/*.o \
	game/mission/world/entities/*.o \
	input/*.o sound/*.o \
	graphics/*.o graphics/2d/*.o graphics/camera/*.o \
	graphics/3d/*.o graphics/3d/city/*.o graphics/3d/collision/*.o \
	$(ALLFLAGS) $(DEBUGFLAGS) $(LIBS) -o $(BINARY)

.cpp.o:
	$(CC) $(ALLFLAGS) $(DEBUGFLAGS) $(CFLAGS) -c $*.cpp -o $(BUILD)/$@

%.d: %.cpp
	$(CC) -MM $(CFLAGS) $< > $@.$$$$; \
	sed 's,\($*\)\.o[ :]*,\1.o $@ : ,g' < $@.$$$$ > $@; \
	rm -f $@.$$$$

include $(OBJECTS:.o=.d)

