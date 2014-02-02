#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <libwebsockets.h>
#include "lpd8806led.h"

#define MAX(x, y) (((x) > (y)) ? (x) : (y))
#define MIN(x, y) (((x) < (y)) ? (x) : (y))

/*****************************************************************************/

#define LED_COUNT (810)

typedef struct _CRGB {
	uint8_t r;
	uint8_t g;
	uint8_t b;
} CRGB;

int leds_fd;
CRGB leds[LED_COUNT] = {0};
lpd8806_buffer leds_buffer = {0};

void LED_show() {
    for (int i=0; i < LED_COUNT; i++) {
        write_gamma_color(
            &leds_buffer.pixels[i],
            leds[i].r,
            leds[i].g,
            leds[i].b
        );
    }
    send_buffer(leds_fd, &leds_buffer);
}

void LED_setup() {
  set_gamma(2.5,2.5,2.5);
  /* Open SPI device */
  leds_fd = open("/dev/spidev0.0",O_WRONLY);
  if(leds_fd<0) {
      /* Open failed */
      fprintf(stderr, "Error: SPI device open failed.\n");
      exit(1);
  }

  /* Initialize SPI bus for lpd8806 pixels */
  if(spi_init(leds_fd)<0) {
      fprintf(stderr, "Unable to initialize SPI bus.\n");
      exit(1);
  }

  /* Allocate memory for the pixel buffer and initialize it */
  if(lpd8806_init(&leds_buffer, LED_COUNT)<0) {
      fprintf(stderr, "Insufficient memory for pixel buffer.\n");
      exit(1);
  }
}

void LED_clear() {
	memset(leds, 0, sizeof(leds));
}

/*****************************************************************************/

#define RX_BUFFER_SIZE (LED_COUNT * sizeof(CRGB))

int websockets_callback(struct libwebsocket_context *context,
                                   libwebsocket *wsi,
                                   libwebsocket_callback_reasons reason,
                                   void *user, void *in, size_t len)
{
    switch (reason) {
        case LWS_CALLBACK_ESTABLISHED:
            printf("connection established\n");
            break;
        case LWS_CALLBACK_CLOSED:
        	printf("connection closed \n");
        	break;
        case LWS_CALLBACK_RECEIVE:
            memcpy(leds, in, MIN(len, RX_BUFFER_SIZE));
            break;
        default:
            break;
    }
   
    return 0;
}

static struct libwebsocket_protocols protocols[] = {
    {
        "leds",   					// name
        websockets_callback, 		// callback
        0,             				// per_session_data_size
        RX_BUFFER_SIZE				// rx_buffer_size
    },
    {
        NULL, NULL, 0   /* End of list */
    }
};


    
const int port = 9000;
struct libwebsocket_context *websockets_context;

int WS_setup() {
	struct lws_context_creation_info info = {0};
	info.port = port;
	info.protocols = protocols;
	info.extensions = libwebsocket_get_internal_extensions();		
	info.gid = -1;
	info.uid = -1;

    websockets_context = libwebsocket_create_context(&info);
   
    if (websockets_context == NULL) {
        fprintf(stderr, "libwebsocket init failed\n");
        exit(1);
    }
}
   

/*****************************************************************************/

void setup() {
	LED_setup();
	WS_setup();

	LED_clear();
}

void loop() {
	libwebsocket_service(websockets_context, 0);
	LED_show();
}

int main() {
    setup();
    while (true) {
        loop();
    }
}
