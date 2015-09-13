USE [homebox]
GO

/****** Object:  Table [dbo].[alarm]    Script Date: 07/09/2015 09:33:43 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[alarm](
	[seqId] [int] IDENTITY(1,1) NOT NULL,
	[boxId] [int] NOT NULL,
	[rtc] [datetime] NOT NULL,
	[sensSn] [int] NOT NULL
) ON [PRIMARY]

GO


