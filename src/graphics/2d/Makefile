CC	= g++
ALLFLAGS = -Wall -O2
DEBUGFLAGS = -g -pg
ROOTDIR = ../..
INCLUDE = $(ROOTDIR)
BUILD   = .#$(ROOTDIR)/objectfiles
CFLAGS	= `sdl-config --cflags` -I$(INCLUDE)
LIBS	= -lm `sdl-config --libs`

OBJECTS	= chyron.o container2d.o countdowntimer.o drawable2d.o fogplane.o \
	  image.o loadbar.o  \
	  shadow.o slidebar.o slidebar2.o clawalert.o text2d.o wordlist2d.o

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

