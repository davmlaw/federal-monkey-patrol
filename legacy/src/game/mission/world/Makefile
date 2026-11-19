CC	= g++
ALLFLAGS = -Wall -O2
DEBUGFLAGS = -g -pg
ROOTDIR = ../../..
INCLUDE = $(ROOTDIR)
BUILD   = .#$(ROOTDIR)/objectfiles
CFLAGS	= `sdl-config --cflags` -I$(INCLUDE)
LIBS	= -lm `sdl-config --libs`
SUBDIRS = entities weapons

OBJECTS	= world.o

all:	$(OBJECTS) $(SUBDIRS)

clean:
	$(foreach obj, $(OBJECTS), rm -f $(BUILD)/$(obj) $(obj:.o=.d))
	for dir in $(SUBDIRS); do \
	  make -C $$dir clean; \
	done

.PHONY: $(SUBDIRS)
$(SUBDIRS):
	make -C $@

.cpp.o:
	$(CC) $(ALLFLAGS) $(DEBUGFLAGS) $(CFLAGS) -c $*.cpp -o $(BUILD)/$@


%.d: %.cpp
	$(CC) -MM $(CFLAGS) $< > $@.$$$$; \
	sed 's,\($*\)\.o[ :]*,\1.o $@ : ,g' < $@.$$$$ > $@; \
	rm -f $@.$$$$

include $(OBJECTS:.o=.d)

