CC	= g++
ALLFLAGS = -Wall -O2
DEBUGFLAGS = -g -pg
ROOTDIR = ../../..
INCLUDE = $(ROOTDIR)
BUILD   = .#$(ROOTDIR)/objectfiles
XMLFLAGS = `xml2-config --cflags`
CFLAGS	= `sdl-config --cflags` -I$(INCLUDE) $(XMLFLAGS)
LIBS	= -lm `sdl-config --libs`
SUBDIRS = 
OBJECTS	= togglefloat.o togglelist.o toggleswitch.o togglefactory.o

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

