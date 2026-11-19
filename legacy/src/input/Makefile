CC	= g++
ALLFLAGS = -Wall -O2
DEBUGFLAGS = -g -pg
ROOTDIR = ..
INCLUDE = $(ROOTDIR)
BUILD = .#$(ROOTDIR)/objectfiles
CFLAGS	= `sdl-config --cflags` -I$(INCLUDE)
LIBS	= -lm `sdl-config --libs`

OBJECTS	= input.o inputmanager.o \
	  joystick.o keyboard.o mouse.o misceventhandler.o menufilter.o

all:	$(OBJECTS)

clean:
	$(foreach obj, $(OBJECTS), rm -f $(BUILD)/$(obj) $(obj:.o=.d))

.cpp.o:
	$(CC) $(ALLFLAGS) $(DEBUGFLAGS) $(CFLAGS) -c $*.cpp -o $(BUILD)/$@


%.d: %.cpp
	$(CC) -MM $(CFLAGS) $< > $@.$$$$; \
	sed 's,\($*\)\.o[ :]*,\1.o $@ : ,g' < $@.$$$$ > $@; \
	rm -f $@.$$$$

include $(OBJECTS:.o=.d)

